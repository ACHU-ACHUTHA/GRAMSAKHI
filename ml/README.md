# GRAMSAKHI ML Triage Module

AI-powered triage risk prediction for ASHA (Accredited Social Health Activist) workers in rural India. This module classifies symptoms and medical conditions into three risk levels: **Low**, **Medium**, and **High**.

## Project Structure

```
ml/
├── data/
│   └── GRAMSAKHI_Symptom_Risk_Dataset.csv   # Training dataset (73 records)
├── models/
│   ├── triage_model.pkl                     # Trained ML model (Random Forest)
│   ├── symptom_encoder.pkl                  # Fitted TF-IDF vectorizer
│   └── risk_encoder.pkl                     # Risk label mapping
├── train.py                                 # Training pipeline
├── predict.py                               # Prediction module
├── api.py                                   # FastAPI server
├── requirements.txt                         # Python dependencies
└── README.md                                # This file
```

## Quick Start

### 1. Install Dependencies

```bash
cd ml
pip install -r requirements.txt
```

### 2. Train the Model

```bash
python train.py
```

This will:
- Load the symptom dataset from `data/`
- Preprocess using TF-IDF vectorization
- Train Decision Tree, Random Forest, and Logistic Regression models
- Compare accuracies and select the best model
- Save artifacts to `models/`

**Sample output:**
```
[4/5] Best model: Logistic Regression
       Test Accuracy: 0.6000  |  CV Accuracy: 0.5182
```

### 3. Test Predictions (CLI)

```bash
python predict.py
```

**Sample output:**
```
Chest Pain                          -> High     (confidence: 0.64)
Common Cold                         -> Low      (confidence: 0.79)
Asthma (Stable)                     -> Medium   (confidence: 0.81)
Breathing Difficulty                -> High     (confidence: 0.83)
```

### 4. Run the API Server

```bash
python api.py
```

The server starts at `http://localhost:8000`. Interactive API docs are available at `http://localhost:8000/docs`.

## API Usage

### POST /predict

Predict the triage risk level for a symptom.

**Request:**
```json
{
  "symptom": "Asthma (Stable)"
}
```

**Response:**
```json
{
  "risk_level": "Medium",
  "confidence": 0.81,
  "warning": null
}
```

### GET /health

Check if the API and model are operational.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

## How It Works

### Feature Engineering
Instead of one-hot encoding each unique symptom string (which cannot generalize), we use **TF-IDF vectorization** on the symptom text. This captures word-level patterns:
- Words like "Severe", "Difficulty", "Failure" correlate with **High** risk
- Words like "Mild", "Minor", "Cold" correlate with **Low** risk
- This allows the model to make reasonable predictions even for symptom descriptions not seen during training

### Models Compared
| Model                       | Test Accuracy | CV Accuracy |
|-----------------------------|--------------|-------------|
| Decision Tree               | 53.3%        | 63.8%       |
| Random Forest               | 53.3%        | 48.3%       |
| **Logistic Regression**     | **60.0%**    | **51.8%**   |

### Dataset
- **Source**: `GRAMSAKHI_Symptom_Risk_Dataset.csv`
- **Records**: 73 symptom/condition entries
- **Classes**: Low (27), Medium (19), High (27)

## Integration

This module is designed to integrate with the GRAMSAKHI React + Firebase application. The FastAPI server provides CORS-enabled endpoints that can be called directly from the frontend.

```javascript
// Example frontend integration
const response = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symptom: 'Chest Pain' })
});
const result = await response.json();
// { risk_level: "High", confidence: 0.64 }
```

## License

Part of the GRAMSAKHI Community Health Platform.
