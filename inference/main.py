"""
IntelliBank ML Inference Service  —  v3.0_enterprise_scale
──────────────────────────────────────────────────────────
Serves the trained .pkl models via a lightweight FastAPI REST API.

Models loaded from ../models/:
  fraud_random_forest.pkl        — 11 features
  fraud_xgboost.pkl              — 11 features
  fraud_isolation_forest.pkl     — 11 features
  segmentation_model.pkl         — 5  features (KMeans, needs scaler)
  segmentation_scaler.pkl        — StandardScaler for segmentation
  recommendation_model.pkl       — 6  features (DecisionTree)
  feature_metadata.json          — feature lists, cluster names, etc.

Feature order is critical — must match sklearn training column order exactly.

Usage:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8001

Deploy to Railway / Render / Fly.io:
  Set env PORT and MODELS_DIR, run uvicorn main:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import json
import os
import time
import logging
import warnings

# Suppress sklearn version mismatch warnings (cosmetic — models function correctly)
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False
    log.warning("joblib not available — models will not load")

# ─── Configuration ────────────────────────────────────────────────────────────

MODELS_DIR = Path(os.environ.get("MODELS_DIR", "../models"))
PORT = int(os.environ.get("PORT", 8001))

# ─── Merchant category encoding (matches sklearn LabelEncoder sorted order) ───
MERCHANT_ENCODING: Dict[str, int] = {
    "Crypto Exchange": 0,
    "Electronics":     1,
    "Entertainment":   2,
    "Fuel":            3,
    "Groceries":       4,
    "Healthcare":      5,
    "Jewelry":         6,
    "Luxury":          7,
    "Restaurants":     8,
    "Shopping":        9,
    "Travel":          10,
    "Utilities":       11,
}
MERCHANT_ENCODING_REVERSE = {v: k for k, v in MERCHANT_ENCODING.items()}

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="IntelliBank ML Inference Service",
    version="3.0.0",
    description="Fraud detection, customer segmentation, and product recommendation inference",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Registry ───────────────────────────────────────────────────────────

class ModelRegistry:
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.load_times: Dict[str, float] = {}

    def load_all(self):
        if not JOBLIB_AVAILABLE:
            log.error("joblib not installed — run: pip install joblib")
            return

        model_files = {
            "fraud_random_forest":    "fraud_random_forest.pkl",
            "fraud_xgboost":          "fraud_xgboost.pkl",
            "fraud_isolation_forest": "fraud_isolation_forest.pkl",
            "segmentation_model":     "segmentation_model.pkl",
            "segmentation_scaler":    "segmentation_scaler.pkl",
            "recommendation_model":   "recommendation_model.pkl",
        }

        for name, filename in model_files.items():
            path = MODELS_DIR / filename
            if path.exists():
                try:
                    t0 = time.time()
                    self.models[name] = joblib.load(path)
                    elapsed = time.time() - t0
                    self.load_times[name] = elapsed
                    log.info(f"  ✓ {name} loaded in {elapsed:.2f}s  ({path.stat().st_size // 1024} KB)")
                except Exception as e:
                    log.error(f"  ✗ {name} FAILED: {e}")
            else:
                log.warning(f"  ⚠ {filename} not found at {path}")

        meta_path = MODELS_DIR / "feature_metadata.json"
        if meta_path.exists():
            with open(meta_path) as f:
                self.metadata = json.load(f)
            log.info(f"  ✓ feature_metadata.json loaded  (version: {self.metadata.get('model_version')})")
        else:
            log.warning("  ⚠ feature_metadata.json not found — using defaults")
            self.metadata = _default_metadata()

    def get(self, name: str):
        return self.models.get(name)

    def is_loaded(self, name: str) -> bool:
        return name in self.models

    def all_status(self) -> List[Dict]:
        all_names = [
            "fraud_random_forest", "fraud_xgboost", "fraud_isolation_forest",
            "segmentation_model", "segmentation_scaler", "recommendation_model",
        ]
        version = self.metadata.get("model_version", "unknown")
        return [
            {
                "name": n,
                "version": version,
                "loaded": self.is_loaded(n),
                "load_time_ms": int(self.load_times.get(n, 0) * 1000),
            }
            for n in all_names
        ]


def _default_metadata() -> Dict:
    return {
        "fraud_features": [
            "amount", "hour", "device_mismatch", "geo_risk_score",
            "merchant_risk_score", "transaction_velocity", "account_age_months",
            "credit_score", "balance_before", "balance_after", "merchant_category_encoded",
        ],
        "segmentation_features": ["monthly_income", "savings_ratio", "account_age_months", "credit_score", "avg_balance"],
        "recommendation_features": ["monthly_income", "savings_ratio", "account_age_months", "credit_score", "avg_balance", "cluster"],
        "cluster_names": {
            "0": "High Value Professional", "1": "Young Saver", "2": "SME Growth Customer",
            "3": "Premium Banking User", "4": "Risk-Sensitive Spender",
        },
        "merchant_categories": list(MERCHANT_ENCODING.keys()),
        "model_version": "fallback-0.0.1",
        "training_date": "unknown",
    }


registry = ModelRegistry()


@app.on_event("startup")
async def startup():
    log.info("=" * 56)
    log.info("  IntelliBank ML Inference Service  —  Starting up")
    log.info(f"  Models directory: {MODELS_DIR.resolve()}")
    log.info("=" * 56)
    registry.load_all()
    loaded = len(registry.models)
    total = 6
    log.info(f"  {loaded}/{total} models loaded — service ready on port {PORT}")
    log.info("=" * 56)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class FraudFeatures(BaseModel):
    """11 features — must match training fraud_features column order exactly."""
    amount:                   float = Field(default=0.0,  description="Transaction amount (LKR)")
    hour:                     int   = Field(default=12,   ge=0, le=23, description="Hour of day 0-23")
    device_mismatch:          int   = Field(default=0,    ge=0, le=1,  description="0=known, 1=unknown device")
    geo_risk_score:           float = Field(default=0.0,  ge=0, le=1,  description="Geographic risk 0-1")
    merchant_risk_score:      float = Field(default=0.1,  ge=0, le=1,  description="Merchant category risk 0-1")
    transaction_velocity:     int   = Field(default=1,    ge=0,        description="Transactions in last hour")
    account_age_months:       int   = Field(default=12,   ge=0,        description="Account age in months")
    credit_score:             int   = Field(default=650,  ge=300, le=900, description="Customer credit score 450-900")
    balance_before:           float = Field(default=0.0,  description="Balance before transaction")
    balance_after:            float = Field(default=0.0,  description="Balance after transaction")
    merchant_category_encoded: int  = Field(default=9,   ge=0, le=11, description="LabelEncoded merchant category 0-11")


class SegmentFeatures(BaseModel):
    """5 features — must match training segmentation_features order exactly."""
    monthly_income:     float = Field(default=100000.0, description="Estimated monthly income (LKR)")
    savings_ratio:      float = Field(default=0.2,      ge=0, le=1, description="Savings / total balance ratio")
    account_age_months: int   = Field(default=24,       ge=0, description="Account age in months")
    credit_score:       int   = Field(default=650,      ge=300, le=900)
    avg_balance:        float = Field(default=300000.0, description="Average / current account balance (LKR)")


class RecFeatures(BaseModel):
    """6 features — segmentation features + cluster."""
    monthly_income:     float = Field(default=100000.0)
    savings_ratio:      float = Field(default=0.2, ge=0, le=1)
    account_age_months: int   = Field(default=24, ge=0)
    credit_score:       int   = Field(default=650, ge=300, le=900)
    avg_balance:        float = Field(default=300000.0)
    cluster:            int   = Field(default=0, ge=0, le=4, description="Segment cluster ID 0-4")


class FraudScoreRequest(BaseModel):
    features: FraudFeatures
    use_ensemble: bool = True


class SegmentRequest(BaseModel):
    user_id: str
    features: SegmentFeatures


class RecommendationRequest(BaseModel):
    user_id: str
    features: RecFeatures


class ExplainRequest(BaseModel):
    features: FraudFeatures
    prediction: float


# ─── Feature Utils ────────────────────────────────────────────────────────────

def fraud_features_to_array(f: FraudFeatures) -> np.ndarray:
    """Convert FraudFeatures to numpy array in exact training column order."""
    return np.array([[
        f.amount,
        f.hour,
        f.device_mismatch,
        f.geo_risk_score,
        f.merchant_risk_score,
        f.transaction_velocity,
        f.account_age_months,
        f.credit_score,
        f.balance_before,
        f.balance_after,
        f.merchant_category_encoded,
    ]])


def segment_features_to_array(f: SegmentFeatures) -> np.ndarray:
    """Convert SegmentFeatures to numpy array in exact training column order."""
    return np.array([[
        f.monthly_income,
        f.savings_ratio,
        f.account_age_months,
        f.credit_score,
        f.avg_balance,
    ]])


def rec_features_to_array(f: RecFeatures) -> np.ndarray:
    """Convert RecFeatures to numpy array in exact training column order."""
    return np.array([[
        f.monthly_income,
        f.savings_ratio,
        f.account_age_months,
        f.credit_score,
        f.avg_balance,
        f.cluster,
    ]])


# ─── Cluster Metadata ─────────────────────────────────────────────────────────

CLUSTER_CHARACTERISTICS = {
    0: [  # High Value Professional
        {"label": "Income Profile",      "value": "High — LKR 200K–350K/mo"},
        {"label": "Spending Pattern",    "value": "Travel, luxury, premium retail"},
        {"label": "Product Affinity",    "value": "Premium travel credit card"},
        {"label": "Risk Profile",        "value": "Low risk, high value"},
    ],
    1: [  # Young Saver
        {"label": "Income Profile",      "value": "Moderate — LKR 40K–70K/mo"},
        {"label": "Spending Pattern",    "value": "Essentials, digital, savings-focused"},
        {"label": "Product Affinity",    "value": "High yield savings, cash-back card"},
        {"label": "Risk Profile",        "value": "Low risk, growth potential"},
    ],
    2: [  # SME Growth Customer
        {"label": "Income Profile",      "value": "High irregular — LKR 300K–500K/mo"},
        {"label": "Spending Pattern",    "value": "Business, equipment, payroll"},
        {"label": "Product Affinity",    "value": "SME business expansion loan"},
        {"label": "Risk Profile",        "value": "Moderate risk, high CLV"},
    ],
    3: [  # Premium Banking User
        {"label": "Income Profile",      "value": "Very high — LKR 700K–1.1M/mo"},
        {"label": "Spending Pattern",    "value": "Investment, luxury, international"},
        {"label": "Product Affinity",    "value": "Wealth management, platinum card"},
        {"label": "Risk Profile",        "value": "Minimal risk, premium tier"},
    ],
    4: [  # Risk-Sensitive Spender
        {"label": "Income Profile",      "value": "Variable — LKR 120K–180K/mo"},
        {"label": "Spending Pattern",    "value": "Conservative, essential spending"},
        {"label": "Product Affinity",    "value": "Cashback card, fixed deposit"},
        {"label": "Risk Profile",        "value": "Low-medium risk, retention focus"},
    ],
}

CLUSTER_RECOMMENDATION_MAP = {
    0: {"product_type": "credit_card",  "product_name": "Premium Travel Credit Card",  "cta": "Apply for Travel Card"},
    1: {"product_type": "savings",      "product_name": "High Yield Savings Account",   "cta": "Open Savings Account"},
    2: {"product_type": "loan",         "product_name": "SME Business Expansion Loan",  "cta": "Apply for SME Loan"},
    3: {"product_type": "wealth",       "product_name": "Wealth Management Portfolio",   "cta": "Start Wealth Management"},
    4: {"product_type": "credit_card",  "product_name": "Cashback Rewards Card",         "cta": "Apply for Cashback Card"},
}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    loaded_count = len(registry.models)
    all_critical = all(
        registry.is_loaded(m)
        for m in ["fraud_random_forest", "fraud_xgboost", "segmentation_model"]
    )
    return {
        "status": "healthy" if all_critical else ("degraded" if loaded_count > 0 else "down"),
        "models_loaded": loaded_count,
        "models_total": 6,
        "model_version": registry.metadata.get("model_version", "unknown"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@app.get("/models")
def list_models():
    return {"models": registry.all_status()}


@app.get("/metadata")
def get_metadata():
    return registry.metadata


@app.post("/predict/fraud")
def predict_fraud(req: FraudScoreRequest):
    """
    Ensemble fraud scoring: RF (40%) + XGB (40%) + IF anomaly (20%).
    Returns ml_score, per-model scores, confidence, and feature importances.
    """
    X = fraud_features_to_array(req.features)
    result: Dict[str, Any] = {}

    # ── Random Forest ──────────────────────────────────────────────────────────
    rf = registry.get("fraud_random_forest")
    if rf is not None:
        try:
            proba = rf.predict_proba(X)[0]
            result["rf_score"] = float(proba[1] if len(proba) > 1 else proba[0])
        except Exception as e:
            log.error(f"RF prediction error: {e}")

    # ── XGBoost ────────────────────────────────────────────────────────────────
    xgb = registry.get("fraud_xgboost")
    if xgb is not None:
        try:
            proba = xgb.predict_proba(X)[0]
            result["xgb_score"] = float(proba[1] if len(proba) > 1 else proba[0])
        except Exception as e:
            log.error(f"XGB prediction error: {e}")

    # ── Isolation Forest (anomaly score → probability proxy) ──────────────────
    iso = registry.get("fraud_isolation_forest")
    if iso is not None:
        try:
            # score_samples returns negative anomaly scores; more negative = more anomalous
            raw_score = iso.score_samples(X)[0]
            # Normalise to 0-1 where 1 = definitely anomalous
            # Typical range is -0.6 to 0.1; we clip and flip
            normalised = float(np.clip((-raw_score - 0.0) / 0.7, 0, 1))
            result["if_score"] = normalised
        except Exception as e:
            log.error(f"IF prediction error: {e}")

    if not result:
        raise HTTPException(status_code=503, detail="No fraud models are loaded. Check models directory.")

    # ── Weighted ensemble ──────────────────────────────────────────────────────
    weights = {"rf_score": 0.4, "xgb_score": 0.4, "if_score": 0.2}
    total_w = sum(weights[k] for k in result if k in weights)
    ml_score = sum(result[k] * weights[k] for k in result if k in weights) / total_w

    # Confidence: higher when RF and XGB agree
    if "rf_score" in result and "xgb_score" in result:
        agreement = 1.0 - abs(result["rf_score"] - result["xgb_score"])
        confidence = min(0.97, 0.70 + agreement * 0.27)
    else:
        confidence = 0.75

    # Feature importances from RF
    feature_names = registry.metadata.get("fraud_features", [
        "amount", "hour", "device_mismatch", "geo_risk_score", "merchant_risk_score",
        "transaction_velocity", "account_age_months", "credit_score",
        "balance_before", "balance_after", "merchant_category_encoded",
    ])
    feature_importance: Dict[str, float] = {}
    if rf is not None and hasattr(rf, "feature_importances_"):
        for name, imp in zip(feature_names, rf.feature_importances_):
            feature_importance[name] = float(imp)

    return {
        "ml_score":          float(ml_score),
        "rf_score":          result.get("rf_score"),
        "xgb_score":         result.get("xgb_score"),
        "if_score":          result.get("if_score"),
        "confidence":        float(confidence),
        "feature_importance": feature_importance,
    }


@app.post("/predict/segment")
def predict_segment(req: SegmentRequest):
    """
    KMeans customer segmentation (5 clusters).
    Applies the trained StandardScaler before prediction.
    """
    model = registry.get("segmentation_model")
    scaler = registry.get("segmentation_scaler")

    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Segmentation model or scaler not loaded.")

    X = segment_features_to_array(req.features)
    X_scaled = scaler.transform(X)
    segment_id = int(model.predict(X_scaled)[0])

    cluster_names = registry.metadata.get("cluster_names", {})
    segment_name = cluster_names.get(str(segment_id), f"Cluster {segment_id}")

    # KMeans doesn't have predict_proba; use distance to nearest centroid as confidence proxy
    distances = model.transform(X_scaled)[0]  # shape: (n_clusters,)
    min_dist = distances[segment_id]
    max_dist = distances.max()
    confidence = float(1.0 - (min_dist / (max_dist + 1e-9)) * 0.4)  # 0.6 – 1.0 range

    characteristics = CLUSTER_CHARACTERISTICS.get(segment_id, [])

    return {
        "segment_id":               segment_id,
        "segment_name":             segment_name,
        "segment_confidence":       round(confidence, 4),
        "segment_characteristics":  characteristics,
    }


@app.post("/predict/recommendations")
def predict_recommendations(req: RecommendationRequest):
    """
    DecisionTree recommendation model.
    Returns the primary recommended product plus confidence score.
    """
    model = registry.get("recommendation_model")

    if model is None:
        raise HTTPException(status_code=503, detail="Recommendation model not loaded.")

    X = rec_features_to_array(req.features)

    try:
        prediction = model.predict(X)[0]   # e.g. "Premium Travel Credit Card"
        classes = model.classes_
        proba = model.predict_proba(X)[0]
        pred_idx = list(classes).index(prediction) if prediction in classes else 0
        confidence = float(proba[pred_idx]) if len(proba) > pred_idx else 0.8
    except Exception as e:
        log.error(f"Recommendation prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Also include segment-matched recommendation as secondary
    cluster_rec = CLUSTER_RECOMMENDATION_MAP.get(req.features.cluster, CLUSTER_RECOMMENDATION_MAP[0])

    # Build reasoning from features
    if req.features.monthly_income > 500_000:
        reasoning = "High income profile and strong account history indicate readiness for premium products."
    elif req.features.savings_ratio > 0.4:
        reasoning = "Strong savings discipline suggests preference for high-yield deposit products."
    elif req.features.account_age_months < 12:
        reasoning = "New customer with growing profile — starter rewards products recommended."
    else:
        reasoning = "Transaction behaviour and financial profile align with this product category."

    primary_product_type = (
        "credit_card" if "card" in prediction.lower()
        else "savings" if "saving" in prediction.lower()
        else "loan" if "loan" in prediction.lower()
        else "wealth" if "wealth" in prediction.lower()
        else "credit_card"
    )

    recommendations = [
        {
            "product_type": primary_product_type,
            "product_name": prediction,
            "confidence":   round(confidence, 4),
            "reasoning":    reasoning,
            "cta":          f"Learn more about {prediction}",
        },
    ]

    # Add segment-matched secondary if different
    if cluster_rec["product_name"] != prediction:
        recommendations.append({
            "product_type": cluster_rec["product_type"],
            "product_name": cluster_rec["product_name"],
            "confidence":   round(max(0.65, confidence - 0.15), 4),
            "reasoning":    f"Customers in the {req.features.cluster} segment frequently choose this product.",
            "cta":          cluster_rec["cta"],
        })

    return {"recommendations": recommendations}


@app.post("/explain/fraud")
def explain_fraud(req: ExplainRequest):
    """
    Returns feature importances from the Random Forest model
    as SHAP-style attribution values for explainability UI.
    """
    rf = registry.get("fraud_random_forest")
    if rf is None:
        raise HTTPException(status_code=503, detail="Random Forest model not loaded.")

    feature_names = registry.metadata.get("fraud_features", [
        "amount", "hour", "device_mismatch", "geo_risk_score", "merchant_risk_score",
        "transaction_velocity", "account_age_months", "credit_score",
        "balance_before", "balance_after", "merchant_category_encoded",
    ])

    # Use SHAP if available
    try:
        import shap
        X = fraud_features_to_array(req.features)
        explainer = shap.TreeExplainer(rf)
        shap_values = explainer.shap_values(X)
        # Binary classification: take class-1 (fraud) SHAP values
        vals = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]

        feature_values = {
            "amount":                    req.features.amount,
            "hour":                      req.features.hour,
            "device_mismatch":           req.features.device_mismatch,
            "geo_risk_score":            req.features.geo_risk_score,
            "merchant_risk_score":       req.features.merchant_risk_score,
            "transaction_velocity":      req.features.transaction_velocity,
            "account_age_months":        req.features.account_age_months,
            "credit_score":              req.features.credit_score,
            "balance_before":            req.features.balance_before,
            "balance_after":             req.features.balance_after,
            "merchant_category_encoded": req.features.merchant_category_encoded,
        }

        FEATURE_LABELS = {
            "amount":                    "Transaction Amount",
            "hour":                      "Time of Day",
            "device_mismatch":           "Device Recognition",
            "geo_risk_score":            "Geographic Risk",
            "merchant_risk_score":       "Merchant Risk",
            "transaction_velocity":      "Transaction Velocity",
            "account_age_months":        "Account Maturity",
            "credit_score":              "Credit Score",
            "balance_before":            "Balance Before",
            "balance_after":             "Balance After",
            "merchant_category_encoded": "Merchant Category",
        }

        factors = sorted([
            {
                "feature":     name,
                "label":       FEATURE_LABELS.get(name, name.replace("_", " ").title()),
                "value":       float(feature_values.get(name, 0)),
                "impact":      float(sv),
                "direction":   "up" if sv > 0.02 else "down" if sv < -0.02 else "neutral",
                "description": _describe_feature(name, feature_values.get(name, 0), sv),
            }
            for name, sv in zip(feature_names, vals)
        ], key=lambda x: abs(x["impact"]), reverse=True)

        return {
            "factors": factors[:6],
            "summary": f"ML ensemble flagged {req.prediction:.1%} fraud probability. "
                       f"Top signal: {factors[0]['label']} ({factors[0]['description']})",
        }

    except ImportError:
        log.warning("shap not installed — using feature importance fallback")

    # Fallback: use RF feature importances as proxy
    feature_importance = dict(zip(feature_names, rf.feature_importances_))
    feature_values_dict = {
        "amount": req.features.amount, "hour": req.features.hour,
        "device_mismatch": req.features.device_mismatch,
        "geo_risk_score": req.features.geo_risk_score,
        "merchant_risk_score": req.features.merchant_risk_score,
        "transaction_velocity": req.features.transaction_velocity,
        "account_age_months": req.features.account_age_months,
        "credit_score": req.features.credit_score,
        "balance_before": req.features.balance_before,
        "balance_after": req.features.balance_after,
        "merchant_category_encoded": req.features.merchant_category_encoded,
    }

    factors = sorted([
        {
            "feature":     name,
            "label":       name.replace("_", " ").title(),
            "value":       float(feature_values_dict.get(name, 0)),
            "impact":      float(imp * req.prediction),
            "direction":   "up" if imp * req.prediction > 0.02 else "neutral",
            "description": f"Contributed {imp:.1%} of model weight.",
        }
        for name, imp in feature_importance.items()
    ], key=lambda x: abs(x["impact"]), reverse=True)

    return {
        "factors": factors[:6],
        "summary": f"Fraud probability: {req.prediction:.1%}. Top contributing feature: {factors[0]['label']}.",
    }


def _describe_feature(name: str, value: Any, shap_val: float) -> str:
    direction = "↑ increases" if shap_val > 0 else "↓ decreases"
    if name == "amount":
        return f"LKR {value:,.0f} {direction} fraud risk"
    if name == "hour":
        return f"Hour {value:02d}:00 — {'late night (high risk)' if value < 6 else 'business hours (normal)'}"
    if name == "device_mismatch":
        return "Unrecognised device detected" if value else "Known device — normal"
    if name == "geo_risk_score":
        return f"Geographic risk score {value:.2f} {direction} fraud probability"
    if name == "merchant_risk_score":
        return f"Merchant risk {value:.2f} {direction} fraud probability"
    if name == "transaction_velocity":
        return f"{int(value)} transactions in last hour — {'elevated' if value > 3 else 'normal'} velocity"
    if name == "account_age_months":
        return f"{int(value)}-month account — {'new' if value < 6 else 'established'}"
    if name == "credit_score":
        return f"Credit score {int(value)} — {'good' if value > 650 else 'subprime'}"
    if name == "balance_before":
        return f"Pre-tx balance: LKR {value:,.0f}"
    if name == "balance_after":
        return f"Post-tx balance: LKR {value:,.0f}"
    if name == "merchant_category_encoded":
        cat = MERCHANT_ENCODING_REVERSE.get(int(value), "Unknown")
        return f"Merchant category: {cat}"
    return f"{name} = {value}"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
