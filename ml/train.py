"""
GRAMSAKHI ML Triage Training Pipeline
======================================
Trains multiple classification models on the GRAMSAKHI Symptom Risk Dataset,
compares their accuracy, and saves the best-performing model along with
the fitted encoders for production inference.

Approach:
  Instead of OneHotEncoding each unique symptom (which fails to generalize
  to unseen symptoms), we use TF-IDF vectorization on the symptom text.
  This allows the model to learn from word-level patterns (e.g., "Severe",
  "Pain", "Bleeding") and generalize to new symptom descriptions.

Models trained:
  - Decision Tree
  - Random Forest
  - Logistic Regression

Outputs (saved to ./models/):
  - triage_model.pkl       : Best-performing trained model
  - symptom_encoder.pkl    : Fitted TfidfVectorizer for symptom text
  - risk_encoder.pkl       : Label mapping dictionary {0: "Low", 1: "Medium", 2: "High"}
"""

import os
import sys
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "GRAMSAKHI_Symptom_Risk_Dataset.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

RISK_LABEL_MAP = {"Low": 0, "Medium": 1, "High": 2}
RISK_LABEL_INVERSE = {v: k for k, v in RISK_LABEL_MAP.items()}

TEST_SIZE = 0.20
RANDOM_STATE = 42


def load_and_preprocess(path: str):
    """Load the CSV dataset and return TF-IDF features and labels."""
    print(f"[1/5] Loading dataset from: {path}")

    if not os.path.exists(path):
        print(f"ERROR: Dataset file not found at {path}")
        sys.exit(1)

    df = pd.read_csv(path)

    # Drop any rows with missing values
    df.dropna(inplace=True)

    # Strip whitespace from column values
    df["symptom_or_condition"] = df["symptom_or_condition"].str.strip()
    df["risk_level"] = df["risk_level"].str.strip()

    print(f"       Loaded {len(df)} records.")
    print(f"       Risk level distribution:")
    print(f"       {df['risk_level'].value_counts().to_dict()}\n")

    # --- Encode features using TF-IDF ---
    # TF-IDF on symptom text captures word-level patterns like "Severe",
    # "Pain", "Difficulty", etc. This generalizes far better than OneHot
    # encoding of entire symptom strings.
    symptom_encoder = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),      # Unigrams + bigrams for better context
        lowercase=True,
        max_features=200,        # Cap features for this small dataset
    )
    X = symptom_encoder.fit_transform(df["symptom_or_condition"])

    # --- Encode labels (risk levels) ---
    y = df["risk_level"].map(RISK_LABEL_MAP).values

    print(f"       TF-IDF vocabulary size: {len(symptom_encoder.vocabulary_)} features")
    print(f"       Feature matrix shape: {X.shape}\n")

    return X, y, symptom_encoder


def train_models(X_train, y_train, X_test, y_test):
    """Train Decision Tree, Random Forest, and Logistic Regression models."""
    print("[3/5] Training models...\n")

    models = {
        "Decision Tree": DecisionTreeClassifier(random_state=RANDOM_STATE),
        "Random Forest": RandomForestClassifier(
            n_estimators=200, random_state=RANDOM_STATE
        ),
        "Logistic Regression": LogisticRegression(
            max_iter=1000, random_state=RANDOM_STATE, C=1.0
        ),
    }

    results = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)

        # Cross-validation on the training set for a more robust estimate
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="accuracy")

        results[name] = {"model": model, "accuracy": acc, "cv_mean": cv_scores.mean()}

        print(f"  +-- {name}")
        print(f"  |   Test Accuracy : {acc:.4f}")
        print(f"  |   CV Accuracy   : {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
        print(f"  |   Classification Report:")
        report = classification_report(
            y_test, y_pred,
            target_names=list(RISK_LABEL_MAP.keys()),
            zero_division=0
        )
        for line in report.split("\n"):
            print(f"  |     {line}")
        print(f"  +--\n")

    return results


def select_best_model(results: dict):
    """Select the model with the highest test accuracy (ties broken by CV)."""
    best_name = max(
        results,
        key=lambda k: (results[k]["accuracy"], results[k]["cv_mean"])
    )
    best_model = results[best_name]["model"]
    best_acc = results[best_name]["accuracy"]
    best_cv = results[best_name]["cv_mean"]

    print(f"[4/5] Best model: {best_name}")
    print(f"       Test Accuracy: {best_acc:.4f}  |  CV Accuracy: {best_cv:.4f}\n")
    return best_name, best_model


def save_artifacts(model, symptom_encoder):
    """Save the trained model and encoders to disk."""
    print(f"[5/5] Saving artifacts to: {MODELS_DIR}/")

    os.makedirs(MODELS_DIR, exist_ok=True)

    model_path = os.path.join(MODELS_DIR, "triage_model.pkl")
    symptom_enc_path = os.path.join(MODELS_DIR, "symptom_encoder.pkl")
    risk_enc_path = os.path.join(MODELS_DIR, "risk_encoder.pkl")

    joblib.dump(model, model_path)
    joblib.dump(symptom_encoder, symptom_enc_path)
    joblib.dump(RISK_LABEL_INVERSE, risk_enc_path)

    print(f"       [OK] triage_model.pkl")
    print(f"       [OK] symptom_encoder.pkl")
    print(f"       [OK] risk_encoder.pkl")
    print("\nTraining pipeline complete.")


def main():
    """Main entry point for the training pipeline."""
    print("=" * 60)
    print("  GRAMSAKHI -- ML Triage Training Pipeline")
    print("=" * 60, "\n")

    # Step 1: Load and preprocess
    X, y, symptom_encoder = load_and_preprocess(DATA_PATH)

    # Step 2: Split data
    print(f"[2/5] Splitting data (test_size={TEST_SIZE}, stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y
    )
    print(f"       Train: {X_train.shape[0]} samples  |  Test: {X_test.shape[0]} samples\n")

    # Step 3: Train models
    results = train_models(X_train, y_train, X_test, y_test)

    # Step 4: Select best
    best_name, best_model = select_best_model(results)

    # Step 5: Save
    save_artifacts(best_model, symptom_encoder)


if __name__ == "__main__":
    main()
