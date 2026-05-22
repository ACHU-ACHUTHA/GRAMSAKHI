const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');

const path = require('path');

try {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './firebase-service-account.json';
  const serviceAccount = require(path.resolve(__dirname, serviceAccountPath));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully.');
} catch (e) {
  console.log('Firebase Admin initialization error (Ensure GOOGLE_APPLICATION_CREDENTIALS is set and the JSON file exists):', e.message);
}

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gramsakhi API is running' });
});

// ASHA Worker Firebase Authentication
app.post('/api/login', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Authentication token is required' });
    }

    // Verify token using Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;
    const phone = decodedToken.phone_number;
    const name = decodedToken.name || 'ASHA Worker';

    if (!email && !phone) {
      return res.status(400).json({ error: 'No email or phone found in token' });
    }

    // Find or create worker
    let worker = await prisma.worker.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined
        ].filter(Boolean)
      }
    });

    if (!worker) {
      worker = await prisma.worker.create({
        data: {
          name,
          email,
          phone,
          village: 'Demo Village'
        }
      });
    }

    res.json(worker);
  } catch (error) {
    console.error('Login error', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Update ASHA Worker Profile
app.put('/api/worker/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, village, age } = req.body;

    const worker = await prisma.worker.update({
      where: { id },
      data: { name, phone, village, age: age ? parseInt(age) : null }
    });

    res.json(worker);
  } catch (error) {
    console.error('Update worker error', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Patients
app.get('/api/patients', async (req, res) => {
  try {
    const { workerId } = req.query;
    const where = workerId ? { workerId } : {};
    const patients = await prisma.patient.findMany({
      where,
      include: { symptoms: true, emergencies: true }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.emergency.deleteMany({ where: { patientId: id } }),
      prisma.symptomLog.deleteMany({ where: { patientId: id } }),
      prisma.patient.delete({ where: { id } })
    ]);
    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Auto-triage helper based on medical history
async function runAutoTriage(patient) {
  if (!patient.medicalHistory) return;

  const HIGH_CONDITIONS = ['cancer','carcinoma','tumor','leukemia','lymphoma','heart failure',
    'kidney failure','renal failure','liver failure','hiv','aids','tuberculosis','tb',
    'sepsis','sickle cell'];
  const MED_CONDITIONS = ['diabetes','diabetic','hypertension','high blood pressure','asthma',
    'copd','epilepsy','anemia','malnutrition','pneumonia','hepatitis','dengue','malaria',
    'typhoid','cardiac','heart disease'];

  const h = patient.medicalHistory.toLowerCase();
  let autoRiskLevel = null;
  let matchedConditions = [];

  HIGH_CONDITIONS.forEach(c => { if (h.includes(c)) matchedConditions.push(c); });
  if (matchedConditions.length > 0) {
    autoRiskLevel = 'High Emergency';
  } else {
    MED_CONDITIONS.forEach(c => { if (h.includes(c)) matchedConditions.push(c); });
    if (matchedConditions.length > 0) autoRiskLevel = 'Moderate Risk';
  }

  if (autoRiskLevel) {
    const guidance = autoRiskLevel === 'High Emergency'
      ? `CRITICAL: Pre-existing high-risk condition(s): ${matchedConditions.join(', ')}. Immediate monitoring required.`
      : `URGENT: Pre-existing condition(s): ${matchedConditions.join(', ')}. Consult PHC within 24 hours.`;

    // Ensure we don't duplicate medical history symptom logs
    const existingLog = await prisma.symptomLog.findFirst({
      where: {
        patientId: patient.id,
        symptoms: `Medical history: ${matchedConditions.join(', ')}`
      }
    });

    if (!existingLog) {
      await prisma.symptomLog.create({
        data: {
          patientId: patient.id,
          symptoms: `Medical history: ${matchedConditions.join(', ')}`,
          riskLevel: autoRiskLevel,
          notes: guidance
        }
      });
    }

    // Auto-create emergency for High Emergency cases
    if (autoRiskLevel === 'High Emergency') {
      const activeEmergency = await prisma.emergency.findFirst({
        where: { patientId: patient.id, status: 'Active' }
      });
      if (!activeEmergency) {
        await prisma.emergency.create({
          data: {
            patientId: patient.id,
            description: `High-risk medical history: ${matchedConditions.join(', ')}`,
            status: 'Active'
          }
        });
      }
    }
  }
}

app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, age, gender, phone, village, workerId: inputWorkerId, medicalHistory, bloodGroup } = req.body;

    // Check if patient already exists (from sync)
    if (id) {
      const existingPatient = await prisma.patient.findUnique({
        where: { id },
        include: { symptoms: true, emergencies: true }
      });
      if (existingPatient) return res.json(existingPatient);
    }

    // Ensure we have a valid worker ID
    let workerId = inputWorkerId;
    if (workerId === 'default-worker' || !workerId) {
      let worker = await prisma.worker.findFirst();
      if (!worker) {
        worker = await prisma.worker.create({
          data: { name: 'Sunita Devi', phone: '9876543210', village: 'Rampur' }
        });
      }
      workerId = worker.id;
    }

    const newPatient = await prisma.patient.create({
      data: { id, name, age, gender, phone, village, workerId, medicalHistory, bloodGroup }
    });

    // Run auto-triage
    await runAutoTriage(newPatient);

    // Return full patient with symptom logs
    const fullPatient = await prisma.patient.findUnique({
      where: { id: newPatient.id },
      include: { symptoms: true, emergencies: true }
    });
    res.json(fullPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// AI Symptom Analysis Route (DDXPlus Triage Predictor)
app.post('/api/analyze-symptoms', async (req, res) => {
  const { symptoms, patientId, medicalHistory } = req.body;

  if (!symptoms || !Array.isArray(symptoms)) {
    return res.status(400).json({ error: 'Symptoms array is required' });
  }

  const triageWeights = {
    // ── Critical / High Emergency Symptoms ──────────────────────────────
    'chest pain': 9.5, 'severe breathing difficulty': 9.8, 'breathing difficulty': 8.0,
    'shortness of breath': 8.0, 'unconscious': 10.0, 'unresponsive': 10.0,
    'seizures': 9.2, 'severe bleeding': 9.5, 'bleeding': 7.5,
    'paralysis': 9.0, 'sudden vision loss': 8.8,
    'severe abdominal pain': 8.5, 'abdominal pain': 6.0,
    'confusion': 8.0, 'stroke': 9.8, 'heart attack': 10.0,

    // ── Urgent / Moderate Risk Symptoms ─────────────────────────────────
    'high fever': 7.0, 'fever': 5.0, 'persistent vomiting': 6.5, 'vomiting': 4.0,
    'severe headache': 6.5, 'headache': 3.0, 'diarrhea': 4.5, 'dizziness': 5.5,
    'palpitations': 6.0, 'weakness': 4.5, 'swelling': 5.0, 'jaundice': 7.0,
    'blood in urine': 7.5, 'blood in stool': 7.5,

    // ── Non-Urgent / Low Risk Symptoms ──────────────────────────────────
    'cough': 3.5, 'runny nose': 2.0, 'sore throat': 3.0, 'mild rash': 3.0,
    'muscle ache': 3.5, 'fatigue': 4.0, 'nausea': 3.5, 'rash': 3.5,
  };

  const medicalHistoryWeights = {
    // Life-threatening conditions
    'cancer': 9.0, 'carcinoma': 9.0, 'tumor': 8.5, 'leukemia': 9.5, 'lymphoma': 9.0,
    'heart disease': 8.5, 'heart failure': 9.0, 'cardiac': 8.5,
    'kidney failure': 9.0, 'renal failure': 9.0, 'liver failure': 9.0,
    'hiv': 8.5, 'aids': 9.0, 'tuberculosis': 8.0, 'tb': 8.0,
    'sepsis': 9.5, 'stroke': 8.5, 'paralysis': 8.5,

    // Moderate / Chronic conditions
    'diabetes': 7.0, 'diabetic': 7.0, 'hypertension': 6.5, 'high blood pressure': 6.5,
    'asthma': 6.0, 'copd': 7.0, 'chronic': 6.0, 'epilepsy': 7.0,
    'anemia': 5.5, 'malnutrition': 6.0, 'pneumonia': 7.5, 'hepatitis': 7.0,
    'thyroid': 5.5, 'arthritis': 4.5, 'sickle cell': 8.0,
    'dengue': 7.5, 'malaria': 7.0, 'typhoid': 6.5,

    // Low-risk conditions
    'allergy': 3.5, 'allergies': 3.5, 'migraine': 4.5,
  };

  let totalRiskScore = 0;
  let maxSingleRisk = 0;

  symptoms.forEach(s => {
    const sym = s.toLowerCase().trim();
    let score = 2.0;
    for (const [key, weight] of Object.entries(triageWeights)) {
      if (sym.includes(key)) score = Math.max(score, weight);
    }
    totalRiskScore += score;
    maxSingleRisk = Math.max(maxSingleRisk, score);
  });

  // Score medical history
  let maxHistoryRisk = 0;
  const matchedConditions = [];
  if (medicalHistory) {
    const hist = medicalHistory.toLowerCase();
    for (const [condition, weight] of Object.entries(medicalHistoryWeights)) {
      if (hist.includes(condition)) {
        matchedConditions.push({ condition, weight });
        if (weight > maxHistoryRisk) maxHistoryRisk = weight;
      }
    }
  }

  const effectiveMaxRisk = Math.max(maxSingleRisk, maxHistoryRisk * 0.95);
  const effectiveTotalScore = totalRiskScore + (maxHistoryRisk > 0 ? maxHistoryRisk * 0.5 : 0);

  let riskLevel = 'Low Risk';
  let guidance = 'Rest, maintain hydration, and monitor symptoms. Consult a local clinic if symptoms persist.';
  let isEmergency = false;

  if (effectiveMaxRisk >= 8.5 || effectiveTotalScore >= 15.0) {
    riskLevel = 'High Emergency';
    guidance = 'CRITICAL TRIAGE: Immediate hospital referral required. Life-threatening pathology possible. Dispatching alert to nearest health center.';
    isEmergency = true;
  } else if (effectiveMaxRisk >= 5.5 || effectiveTotalScore >= 9.0) {
    riskLevel = 'Moderate Risk';
    guidance = 'URGENT TRIAGE: Consult with a primary health center within 24 hours. Monitor closely for escalation of symptoms.';
  }

  if (matchedConditions.length > 0 && symptoms.length === 0) {
    guidance += ` Pre-existing condition(s) detected: ${matchedConditions.map(c => c.condition).join(', ')}.`;
  }

  // Save symptom log if patientId provided
  let logId = null;
  if (patientId) {
    try {
      const log = await prisma.symptomLog.create({
        data: { patientId, symptoms: symptoms.join(', '), riskLevel, notes: guidance }
      });
      logId = log.id;

      if (isEmergency) {
        const activeEmergency = await prisma.emergency.findFirst({
          where: { patientId, status: 'Active' }
        });
        if (!activeEmergency) {
          await prisma.emergency.create({
            data: {
              patientId,
              description: `High risk symptoms: ${symptoms.join(', ')}${matchedConditions.length ? ` | History: ${matchedConditions.map(c => c.condition).join(', ')}` : ''}`,
              status: 'Active'
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to log symptom', e);
    }
  }

  res.json({ riskLevel, guidance, isEmergency, analyzedSymptoms: symptoms, matchedConditions, logId });
});


// Sync Offline Queue
app.post('/api/sync', async (req, res) => {
  const { queue } = req.body;
  if (!queue || !Array.isArray(queue)) {
    return res.status(400).json({ error: 'Invalid queue format' });
  }

  const processedIds = [];

  for (const item of queue) {
    try {
      if (item.type === 'PATIENT') {
        const p = item.payload;
        let exists = await prisma.patient.findUnique({ where: { id: p.id } });

        let workerId = p.workerId;
        if (workerId === 'default-worker' || !workerId) {
          let worker = await prisma.worker.findFirst();
          if (!worker) worker = await prisma.worker.create({ data: { name: 'Sunita Devi', phone: '9876543210', village: 'Rampur' } });
          workerId = worker.id;
        }

        if (!exists) {
          exists = await prisma.patient.create({
            data: { id: p.id, name: p.name, age: p.age, gender: p.gender, phone: p.phone, village: p.village, workerId, medicalHistory: p.medicalHistory, bloodGroup: p.bloodGroup }
          });
        }
        await runAutoTriage(exists);
        processedIds.push(item.id);
      } else if (item.type === 'SYMPTOM_LOG') {
        const l = item.payload;
        const exists = await prisma.symptomLog.findUnique({ where: { id: l.id } });
        if (!exists) {
          await prisma.symptomLog.create({
            data: { id: l.id, patientId: l.patientId, symptoms: l.symptoms, riskLevel: l.riskLevel, notes: l.notes, createdAt: new Date(l.createdAt || Date.now()) }
          });
          if (l.riskLevel === 'High Emergency') {
            // Prevent duplicate active emergencies
            const activeEmergency = await prisma.emergency.findFirst({
              where: { patientId: l.patientId, status: 'Active' }
            });

            if (!activeEmergency) {
              await prisma.emergency.create({
                data: {
                  patientId: l.patientId,
                  description: `Emergency sync: ${l.symptoms}`,
                  status: 'Active'
                }
              });
            }
          }
        }
        processedIds.push(item.id);
      } else if (item.type === 'DELETE_PATIENT') {
        const { id } = item.payload;
        try {
          await prisma.$transaction([
            prisma.emergency.deleteMany({ where: { patientId: id } }),
            prisma.symptomLog.deleteMany({ where: { patientId: id } }),
            prisma.patient.delete({ where: { id } })
          ]);
        } catch (e) {
          console.log(`Failed or already deleted patient in sync: ${id}`);
        }
        processedIds.push(item.id);
      }
    } catch (err) {
      console.error('Sync error for item', item.id, err);
    }
  }

  res.json({ processedIds });
});

// Emergencies
app.get('/api/emergencies', async (req, res) => {
  try {
    const emergencies = await prisma.emergency.findMany({
      include: { patient: true },
      where: { status: 'Active' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(emergencies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emergencies' });
  }
});

// Resolve an emergency and remove patient data automatically
app.patch('/api/emergencies/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const emergency = await prisma.emergency.findUnique({
      where: { id }
    });
    
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }
    
    const patientId = emergency.patientId;
    
    // Remove the patient data completely (deletes patient, emergencies, and symptom logs)
    await prisma.$transaction([
      prisma.emergency.deleteMany({ where: { patientId } }),
      prisma.symptomLog.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } })
    ]);
    
    res.json({ success: true, message: 'Emergency resolved and patient data removed', patientId });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({ error: 'Failed to resolve emergency and remove patient data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
