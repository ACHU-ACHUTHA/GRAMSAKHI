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

app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, age, gender, phone, village, workerId: inputWorkerId, medicalHistory } = req.body;

    // Check if patient already exists (from sync)
    if (id) {
      const existingPatient = await prisma.patient.findUnique({ where: { id } });
      if (existingPatient) {
        return res.json(existingPatient);
      }
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
      data: { id, name, age, gender, phone, village, workerId, medicalHistory }
    });
    res.json(newPatient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// AI Symptom Analysis Route (DDXPlus Triage Predictor)
app.post('/api/analyze-symptoms', async (req, res) => {
  const { symptoms, patientId } = req.body;

  if (!symptoms || !Array.isArray(symptoms)) {
    return res.status(400).json({ error: 'Symptoms array is required' });
  }

  const triageWeights = {
    // Critical Pathologies / High Emergency
    'chest pain': 9.5, 'severe breathing difficulty': 9.8, 'unconscious': 10.0,
    'seizures': 9.2, 'severe bleeding': 9.5, 'paralysis': 9.0, 'sudden vision loss': 8.8,
    'severe abdominal pain': 8.5, 'confusion': 8.0,

    // Urgent / Moderate Risk
    'high fever': 7.0, 'fever': 5.0, 'persistent vomiting': 6.5, 'vomiting': 4.0,
    'severe headache': 6.5, 'headache': 3.0, 'diarrhea': 4.5, 'dizziness': 5.5,
    'palpitations': 6.0, 'weakness': 4.5,

    // Non-Urgent / Low Risk
    'cough': 3.5, 'runny nose': 2.0, 'sore throat': 3.0, 'mild rash': 3.0,
    'muscle ache': 3.5, 'fatigue': 4.0,
  };

  let totalRiskScore = 0;
  let maxSingleRisk = 0;

  symptoms.forEach(s => {
    const sym = s.toLowerCase().trim();
    let score = 2.0; // Base score
    for (const [key, weight] of Object.entries(triageWeights)) {
      if (sym.includes(key)) {
        score = Math.max(score, weight);
      }
    }
    totalRiskScore += score;
    maxSingleRisk = Math.max(maxSingleRisk, score);
  });

  let riskLevel = 'Low Risk';
  let guidance = 'Rest, maintain hydration, and monitor symptoms. Consult a local clinic if symptoms persist.';
  let isEmergency = false;

  if (maxSingleRisk >= 8.5 || totalRiskScore >= 15.0) {
    riskLevel = 'High Emergency';
    guidance = 'CRITICAL TRIAGE: Immediate hospital referral required. Life-threatening pathology possible. Dispatching alert to nearest health center.';
    isEmergency = true;
  } else if (maxSingleRisk >= 5.5 || totalRiskScore >= 9.0) {
    riskLevel = 'Moderate Risk';
    guidance = 'URGENT TRIAGE: Consult with a primary health center within 24 hours. Monitor closely for escalation of symptoms.';
  }

  // If patientId is provided, save the symptom log
  let logId = null;
  if (patientId) {
    try {
      const log = await prisma.symptomLog.create({
        data: {
          patientId,
          symptoms: symptoms.join(', '),
          riskLevel,
          notes: guidance
        }
      });
      logId = log.id;

      if (isEmergency) {
        // Prevent duplicate active emergencies
        const activeEmergency = await prisma.emergency.findFirst({
          where: { patientId, status: 'Active' }
        });

        if (!activeEmergency) {
          await prisma.emergency.create({
            data: {
              patientId,
              description: `High risk symptoms: ${symptoms.join(', ')}`,
              status: 'Active'
            }
          });
        }
      }
    } catch (e) {
      console.error('Failed to log symptom', e);
    }
  }

  res.json({
    riskLevel,
    guidance,
    isEmergency,
    analyzedSymptoms: symptoms,
    logId
  });
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
        const exists = await prisma.patient.findUnique({ where: { id: p.id } });

        let workerId = p.workerId;
        if (workerId === 'default-worker' || !workerId) {
          let worker = await prisma.worker.findFirst();
          if (!worker) worker = await prisma.worker.create({ data: { name: 'Sunita Devi', phone: '9876543210', village: 'Rampur' } });
          workerId = worker.id;
        }

        if (!exists) {
          await prisma.patient.create({
            data: { id: p.id, name: p.name, age: p.age, gender: p.gender, phone: p.phone, village: p.village, workerId, medicalHistory: p.medicalHistory }
          });
        }
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

// Resolve an emergency
app.patch('/api/emergencies/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.emergency.update({
      where: { id },
      data: { status: 'Resolved', resolvedAt: new Date() }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve emergency' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
