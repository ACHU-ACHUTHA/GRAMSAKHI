"""
GRAMSAKHI ML Triage Predictor
==============================
A reusable prediction module that loads the trained triage model and
TF-IDF vectorizer, then exposes a simple `predict(symptom)` interface.

Usage:
    from predict import TriagePredictor

    predictor = TriagePredictor()
    result = predictor.predict("Chest Pain")
    print(result)
    # {"risk_level": "High", "confidence": 0.97}
"""

import os
import numpy as np
import joblib


class TriagePredictor:
    """
    Loads the saved triage model and TF-IDF vectorizer, and provides a
    `predict(symptom: str)` method that returns risk level and confidence.
    """

    def __init__(self, models_dir: str = None):
        """
        Initialize the predictor by loading model artifacts from disk.

        Args:
            models_dir: Path to the directory containing .pkl files.
                        Defaults to ./models/ relative to this script.
        """
        if models_dir is None:
            models_dir = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "models"
            )

        model_path = os.path.join(models_dir, "triage_model.pkl")
        symptom_enc_path = os.path.join(models_dir, "symptom_encoder.pkl")
        risk_enc_path = os.path.join(models_dir, "risk_encoder.pkl")

        # Validate that all artifacts exist
        for path, name in [
            (model_path, "triage_model.pkl"),
            (symptom_enc_path, "symptom_encoder.pkl"),
            (risk_enc_path, "risk_encoder.pkl"),
        ]:
            if not os.path.exists(path):
                raise FileNotFoundError(
                    f"Model artifact '{name}' not found at {path}. "
                    "Please run train.py first."
                )

        self.model = joblib.load(model_path)
        self.symptom_encoder = joblib.load(symptom_enc_path)   # TfidfVectorizer
        self.risk_encoder = joblib.load(risk_enc_path)         # {0: "Low", 1: "Medium", 2: "High"}

    def predict(self, symptom: str) -> dict:
        """
        Predict the triage risk level for a given symptom or condition.

        Args:
            symptom: A string describing the symptom or condition
                     (e.g., "Chest Pain", "Common Cold").

        Returns:
            dict with keys:
                - risk_level (str): "Low", "Medium", or "High"
                - confidence (float): Probability of the predicted class (0.0-1.0)
                - warning (str, optional): Present if the symptom has no known words
        """
        symptom = symptom.strip()

        # Transform using the fitted TF-IDF vectorizer
        X = self.symptom_encoder.transform([symptom])

        # Check if the symptom produced any TF-IDF features at all
        # (all zeros means no recognized words from training vocabulary)
        is_unknown = X.nnz == 0

        # Get predicted class and probabilities
        predicted_class = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        confidence = float(np.max(probabilities))

        risk_level = self.risk_encoder.get(predicted_class, "Unknown")

        result = {
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
        }

        # If the symptom was completely unknown, flag it in the response
        if is_unknown:
            result["warning"] = (
                f"Symptom '{symptom}' contains no recognized terms from training data. "
                "Prediction may be unreliable."
            )

        return result


# ---------------------------------------------------------------------------
# Quick CLI test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    predictor = TriagePredictor()

    test_symptoms = [
        "Chest Pain",
        "Common Cold",
        "Asthma (Stable)",
        "Snake Bite",
        "Headache",
        "High Fever (>103F)",
        "Breathing Difficulty",
        "Mild Skin Rash",
        "Pregnancy Complications",
        "Unknown Symptom XYZ",
    ]

    print("GRAMSAKHI Triage Predictor -- Quick Test")
    print("=" * 60)
    for symptom in test_symptoms:
        result = predictor.predict(symptom)
        risk = result["risk_level"]
        conf = result["confidence"]
        warning = result.get("warning", "")
        print(f"  {symptom:35s} -> {risk:8s} (confidence: {conf:.2f})"
              + (f"  [!] {warning}" if warning else ""))
    print()
