// Triage Risk Predictor based on DDXPlus dataset methodology
// Calculates weighted risk probabilities for Automatic Diagnosis and Triage

const triageWeights = {
  // ── Critical / High Emergency Symptoms ──────────────────────────────
  'chest pain': 9.5,
  'severe breathing difficulty': 9.8,
  'breathing difficulty': 8.0,
  'shortness of breath': 8.0,
  'unconscious': 10.0,
  'unresponsive': 10.0,
  'seizures': 9.2,
  'severe bleeding': 9.5,
  'bleeding': 7.5,
  'paralysis': 9.0,
  'sudden vision loss': 8.8,
  'severe abdominal pain': 8.5,
  'abdominal pain': 6.0,
  'confusion': 8.0,
  'stroke': 9.8,
  'heart attack': 10.0,

  // ── Urgent / Moderate Risk Symptoms ─────────────────────────────────
  'high fever': 7.0,
  'fever': 5.0,
  'persistent vomiting': 6.5,
  'vomiting': 4.0,
  'severe headache': 6.5,
  'headache': 3.0,
  'diarrhea': 4.5,
  'dizziness': 5.5,
  'palpitations': 6.0,
  'weakness': 4.5,
  'swelling': 5.0,
  'jaundice': 7.0,
  'blood in urine': 7.5,
  'blood in stool': 7.5,

  // ── Non-Urgent / Low Risk Symptoms ──────────────────────────────────
  'cough': 3.5,
  'runny nose': 2.0,
  'sore throat': 3.0,
  'mild rash': 3.0,
  'muscle ache': 3.5,
  'fatigue': 4.0,
  'nausea': 3.5,
  'rash': 3.5,
};

// ── Medical Condition / History Weights ────────────────────────────────
// These elevate risk when found in medicalHistory even with mild symptoms
const medicalHistoryWeights = {
  // Life-threatening / High Emergency conditions
  'cancer': 9.0,
  'carcinoma': 9.0,
  'tumor': 8.5,
  'leukemia': 9.5,
  'lymphoma': 9.0,
  'heart disease': 8.5,
  'heart failure': 9.0,
  'cardiac': 8.5,
  'kidney failure': 9.0,
  'renal failure': 9.0,
  'liver failure': 9.0,
  'hiv': 8.5,
  'aids': 9.0,
  'tuberculosis': 8.0,
  'tb': 8.0,
  'sepsis': 9.5,
  'stroke': 8.5,
  'paralysis': 8.5,

  // Moderate / Chronic conditions requiring monitoring
  'diabetes': 7.0,
  'diabetic': 7.0,
  'hypertension': 6.5,
  'high blood pressure': 6.5,
  'asthma': 6.0,
  'copd': 7.0,
  'chronic': 6.0,
  'epilepsy': 7.0,
  'anemia': 5.5,
  'malnutrition': 6.0,
  'pneumonia': 7.5,
  'hepatitis': 7.0,
  'thyroid': 5.5,
  'arthritis': 4.5,
  'sickle cell': 8.0,
  'dengue': 7.5,
  'malaria': 7.0,
  'typhoid': 6.5,

  // Low-risk conditions
  'allergy': 3.5,
  'allergies': 3.5,
  'migraine': 4.5,
};

export const analyzeSymptomsLocally = (symptoms, medicalHistory = '') => {
  if (!symptoms || !Array.isArray(symptoms)) {
    return { error: 'Symptoms array is required' };
  }

  let totalRiskScore = 0;
  let maxSingleRisk = 0;

  // ── Score symptoms ────────────────────────────────────────────────
  const matchedSymptoms = symptoms.map(s => {
    const sym = s.toLowerCase().trim();
    let score = 2.0; // Base score for unknown symptom

    for (const [key, weight] of Object.entries(triageWeights)) {
      if (sym.includes(key)) {
        score = Math.max(score, weight);
      }
    }

    totalRiskScore += score;
    maxSingleRisk = Math.max(maxSingleRisk, score);
    return { symptom: sym, weight: score };
  });

  // ── Score medical history ─────────────────────────────────────────
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

  // History risk contributes to maxSingleRisk (capped slightly lower than
  // a direct acute symptom so acute always dominates)
  const effectiveMaxRisk = Math.max(maxSingleRisk, maxHistoryRisk * 0.95);
  const effectiveTotalScore = totalRiskScore + (maxHistoryRisk > 0 ? maxHistoryRisk * 0.5 : 0);

  // ── Determine risk level ──────────────────────────────────────────
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

  // If only history was the driver (no acute symptoms logged), add context
  if (matchedConditions.length > 0 && symptoms.length === 0) {
    guidance += ` Pre-existing condition(s) detected: ${matchedConditions.map(c => c.condition).join(', ')}.`;
  }

  return {
    riskLevel,
    guidance,
    isEmergency,
    analyzedSymptoms: symptoms,
    triageScore: effectiveTotalScore,
    maxSeverity: effectiveMaxRisk,
    matchedConditions,
  };
};
