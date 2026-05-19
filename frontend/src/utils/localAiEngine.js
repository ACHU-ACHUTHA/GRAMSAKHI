// Simplified Triage Risk Predictor based on DDXPlus dataset methodology
// Calculates weighted risk probabilities for Automatic Diagnosis and Triage

const triageWeights = {
  // Critical Pathologies / High Emergency
  'chest pain': 9.5,
  'severe breathing difficulty': 9.8,
  'unconscious': 10.0,
  'seizures': 9.2,
  'severe bleeding': 9.5,
  'paralysis': 9.0,
  'sudden vision loss': 8.8,
  'severe abdominal pain': 8.5,
  'confusion': 8.0,
  
  // Urgent / Moderate Risk
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
  
  // Non-Urgent / Low Risk
  'cough': 3.5,
  'runny nose': 2.0,
  'sore throat': 3.0,
  'mild rash': 3.0,
  'muscle ache': 3.5,
  'fatigue': 4.0,
};

export const analyzeSymptomsLocally = (symptoms) => {
  if (!symptoms || !Array.isArray(symptoms)) {
    return { error: 'Symptoms array is required' };
  }

  let totalRiskScore = 0;
  let maxSingleRisk = 0;
  
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

  // Calculate Triage Probability
  let riskLevel = 'Low Risk';
  let guidance = 'Rest, maintain hydration, and monitor symptoms. Consult a local clinic if symptoms persist.';
  let isEmergency = false;

  // DDXPlus Triage Thresholds
  if (maxSingleRisk >= 8.5 || totalRiskScore >= 15.0) {
    riskLevel = 'High Emergency';
    guidance = 'CRITICAL TRIAGE: Immediate hospital referral required. Life-threatening pathology possible. Dispatching alert to nearest health center.';
    isEmergency = true;
  } else if (maxSingleRisk >= 5.5 || totalRiskScore >= 9.0) {
    riskLevel = 'Moderate Risk';
    guidance = 'URGENT TRIAGE: Consult with a primary health center within 24 hours. Monitor closely for escalation of symptoms.';
  }

  return {
    riskLevel,
    guidance,
    isEmergency,
    analyzedSymptoms: symptoms,
    triageScore: totalRiskScore,
    maxSeverity: maxSingleRisk
  };
};
