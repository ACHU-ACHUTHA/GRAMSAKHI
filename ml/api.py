"""
GRAMSAKHI ML Triage API
========================
FastAPI server that exposes a POST /predict endpoint for real-time
triage risk prediction. Designed to be integrated with the GRAMSAKHI
React + Firebase application.

Run:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import TriagePredictor


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    """Request body for the /predict endpoint."""
    symptom: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="The symptom or medical condition to classify.",
        json_schema_extra={"examples": ["Asthma (Stable)"]},
    )


class PredictResponse(BaseModel):
    """Response body for the /predict endpoint."""
    risk_level: str = Field(
        ...,
        description="Predicted triage risk level: Low, Medium, or High.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence score for the prediction (0.0–1.0).",
    )
    warning: str | None = Field(
        default=None,
        description="Optional warning if the symptom was not in training data.",
    )


class HealthResponse(BaseModel):
    """Response body for the /health endpoint."""
    status: str
    model_loaded: bool


# ---------------------------------------------------------------------------
# Application Lifespan — load model once at startup
# ---------------------------------------------------------------------------
predictor: TriagePredictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model when the server starts."""
    global predictor
    models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    try:
        predictor = TriagePredictor(models_dir=models_dir)
        print("[OK] Triage model loaded successfully.")
    except FileNotFoundError as e:
        print(f"[WARNING] {e}")
        print("  The /predict endpoint will return 503 until the model is trained.")
        predictor = None
    yield


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="GRAMSAKHI Triage API",
    description=(
        "AI-assisted triage risk prediction for ASHA workers. "
        "Classifies symptoms into Low, Medium, or High risk levels."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS so the React frontend can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Check if the API server and model are operational."""
    return HealthResponse(
        status="ok",
        model_loaded=predictor is not None,
    )


@app.post("/predict", response_model=PredictResponse, tags=["Triage"])
async def predict_risk(request: PredictRequest):
    """
    Predict the triage risk level for a given symptom or condition.

    Returns the predicted risk level (Low / Medium / High) along with
    a confidence score between 0.0 and 1.0.
    """
    # Guard: model must be loaded
    if predictor is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Triage model is not loaded. "
                "Please run 'python train.py' to train and save the model first."
            ),
        )

    try:
        result = predictor.predict(request.symptom)
        return PredictResponse(**result)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Entry point for direct execution
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
