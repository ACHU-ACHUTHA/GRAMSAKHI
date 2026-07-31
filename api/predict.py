"""
GRAMSAKHI Vercel ML Triage Serverless Function
================================================
FastAPI serverless function for Vercel deployment that loads the trained
scikit-learn triage model from ./models/ and serves predictions.
"""

import os
import sys
import traceback
from contextlib import asynccontextmanager
import numpy as np
import joblib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# TriagePredictor Class
# ---------------------------------------------------------------------------
class TriagePredictor:
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            models_dir = os.path.join(
                os.path.dirname(os.path.abspath(__file__)), "models"
            )

        model_path = os.path.join(models_dir, "triage_model.pkl")
        symptom_enc_path = os.path.join(models_dir, "symptom_encoder.pkl")
        risk_enc_path = os.path.join(models_dir, "risk_encoder.pkl")

        for path, name in [
            (model_path, "triage_model.pkl"),
            (symptom_enc_path, "symptom_encoder.pkl"),
            (risk_enc_path, "risk_encoder.pkl"),
        ]:
            if not os.path.exists(path):
                raise FileNotFoundError(
                    f"Model artifact '{name}' not found at {path}."
                )

        self.model = joblib.load(model_path)
        self.symptom_encoder = joblib.load(symptom_enc_path)
        self.risk_encoder = joblib.load(risk_enc_path)

    def predict(self, symptom: str) -> dict:
        symptom = symptom.strip()
        X = self.symptom_encoder.transform([symptom])
        is_unknown = X.nnz == 0

        predicted_class = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        confidence = float(np.max(probabilities))
        risk_level = self.risk_encoder.get(predicted_class, "Unknown")

        result = {
            "risk_level": risk_level,
            "confidence": round(confidence, 4),
        }
        if is_unknown:
            result["warning"] = (
                f"Symptom '{symptom}' contains no recognized terms from training data."
            )
        return result


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    symptom: str = Field(..., min_length=1, max_length=500)

class PredictResponse(BaseModel):
    risk_level: str
    confidence: float
    warning: str | None = None


# ---------------------------------------------------------------------------
# Application Lifespan
# ---------------------------------------------------------------------------
predictor: TriagePredictor | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    # Look for models in api/models first, then fallback to ml/models
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    if not os.path.exists(os.path.join(models_dir, "triage_model.pkl")):
        models_dir = os.path.join(base_dir, "..", "ml", "models")

    try:
        predictor = TriagePredictor(models_dir=models_dir)
        print(f"[OK] ML Triage model loaded successfully from {models_dir}.")
    except Exception as e:
        print(f"[WARNING] Could not load ML model: {e}")
        predictor = None
    yield


app = FastAPI(
    title="GRAMSAKHI ML Triage API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.get("/api/ml-predict/health")
async def health_check():
    return {
        "status": "ok",
        "model_loaded": predictor is not None
    }


@app.post("/predict", response_model=PredictResponse)
@app.post("/api/ml-predict", response_model=PredictResponse)
async def predict_risk(request: PredictRequest):
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail="Triage model is not loaded."
        )

    try:
        result = predictor.predict(request.symptom)
        return PredictResponse(**result)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
