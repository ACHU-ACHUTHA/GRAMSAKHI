"""
GRAMSAKHI ML Triage Evaluation Script
======================================
Loads the serialized models/encoders and evaluates their performance
on the held-out test set using the same split as train.py.
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "GRAMSAKHI_Symptom_Risk_Dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

RISK_LABEL_MAP = {"Low": 0, "Medium": 1, "High": 2}

TEST_SIZE = 0.20
RANDOM_STATE = 42


def evaluate_saved_model():
    print("=" * 60)
    print("  GRAMSAKHI -- Saved Model Evaluation Pipeline")
    print("=" * 60, "\n")

    # Step 1: Load and verify dataset
    print(f"[1/4] Loading dataset from: {DATA_PATH}")
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: Dataset file not found at {DATA_PATH}")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH)
    df.dropna(inplace=True)
    df["symptom_or_condition"] = df["symptom_or_condition"].str.strip()
    df["risk_level"] = df["risk_level"].str.strip()

    print(f"       Loaded {len(df)} records.")

    # Split into features (text) and target labels
    X_text = np.array(df["symptom_or_condition"].tolist())
    y = np.array(df["risk_level"].map(RISK_LABEL_MAP).tolist())

    # Step 2: Split data (must match train.py)
    print(f"[2/4] Extracting held-out test set (test_size={TEST_SIZE}, stratified)...")
    _, X_text_test, _, y_test = train_test_split(
        X_text, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )
    print(f"       Held-out test set size: {len(y_test)} samples")

    # Step 3: Load serialized artifacts
    print(f"[3/4] Loading serialized model and encoder from: {MODELS_DIR}/")
    model_path = os.path.join(MODELS_DIR, "triage_model.pkl")
    symptom_enc_path = os.path.join(MODELS_DIR, "symptom_encoder.pkl")

    if not os.path.exists(model_path) or not os.path.exists(symptom_enc_path):
        print("ERROR: Model artifacts not found. Please run train.py first.")
        sys.exit(1)

    model = joblib.load(model_path)
    symptom_encoder = joblib.load(symptom_enc_path)

    # Step 4: Run evaluation
    print("[4/4] Running inference & calculating metrics...\n")

    # Transform test features
    X_test = symptom_encoder.transform(X_text_test)

    # Predict and calculate probabilities
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)

    # Metrics calculation
    acc = accuracy_score(y_test, y_pred)
    
    # Weighted and Macro averages
    prec_weighted = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    prec_macro = precision_score(y_test, y_pred, average="macro", zero_division=0)
    rec_weighted = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    rec_macro = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1_weighted = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    f1_macro = f1_score(y_test, y_pred, average="macro", zero_division=0)
    
    roc_auc_weighted = roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
    roc_auc_macro = roc_auc_score(y_test, y_prob, multi_class="ovr", average="macro")

    print(f"Evaluation Results for Loaded Model ({type(model).__name__}):")
    print(f"-" * 50)
    print(f"  Test Accuracy        : {acc:.4f} ({acc*100:.1f}%)")
    print(f"  Weighted Precision   : {prec_weighted:.4f}")
    print(f"  Macro Precision      : {prec_macro:.4f}")
    print(f"  Weighted Recall      : {rec_weighted:.4f}")
    print(f"  Macro Recall         : {rec_macro:.4f}")
    print(f"  Weighted F1-score    : {f1_weighted:.4f}")
    print(f"  Macro F1-score       : {f1_macro:.4f}")
    print(f"  Weighted ROC-AUC     : {roc_auc_weighted:.4f}")
    print(f"  Macro ROC-AUC        : {roc_auc_macro:.4f}")
    print(f"-" * 50)
    
    print("\nDetailed Classification Report:")
    report = classification_report(
        y_test, y_pred,
        target_names=list(RISK_LABEL_MAP.keys()),
        zero_division=0
    )
    print(report)

    # Calculate class-wise ROC-AUC scores
    print("Class-wise ROC-AUC scores (One-vs-Rest):")
    for label_name, label_idx in RISK_LABEL_MAP.items():
        y_test_class = (y_test == label_idx).astype(int)
        y_prob_class = y_prob[:, label_idx]
        class_auc = roc_auc_score(y_test_class, y_prob_class)
        print(f"  - {label_name:<8s} : {class_auc:.4f}")

    # Confusion Matrix
    print("\nConfusion Matrix (rows=Actual, cols=Predicted):")
    labels = list(RISK_LABEL_MAP.keys())
    cm = confusion_matrix(y_test, y_pred)
    header = f"{'':>10s}" + "".join(f"{l:>10s}" for l in labels)
    print(header)
    for i, row_label in enumerate(labels):
        row = f"{row_label:>10s}" + "".join(f"{cm[i][j]:>10d}" for j in range(len(labels)))
        print(row)

    # Train accuracy check (overfitting indicator)
    X_full = symptom_encoder.transform(np.array(df["symptom_or_condition"].tolist()))
    X_train_full, _, y_train_full, _ = train_test_split(
        X_full, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    train_acc = accuracy_score(y_train_full, model.predict(X_train_full))
    print(f"\nOverfitting Check:")
    print(f"  Train Accuracy : {train_acc:.4f}")
    print(f"  Test  Accuracy : {acc:.4f}")
    gap = train_acc - acc
    status = "[WARNING] Overfitting detected" if gap > 0.15 else "[OK] Acceptable gap"
    print(f"  Gap            : {gap:.4f}  {status}")


if __name__ == "__main__":
    evaluate_saved_model()
