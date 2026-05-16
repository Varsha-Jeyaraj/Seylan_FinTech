# IntelliBank ML Inference Service

Lightweight FastAPI service that serves Python `.pkl` models to the Next.js frontend.

## Quick Start

```bash
cd inference
pip install -r requirements.txt

# Place your .pkl models in ../models/
# Then start the service:
uvicorn main:app --reload --port 8001
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Service health + model count |
| GET | /models | List all models and their status |
| GET | /metadata | Feature metadata from feature_metadata.json |
| POST | /predict/fraud | Ensemble fraud score (RF + XGB + IF) |
| POST | /predict/segment | Customer segmentation |
| POST | /predict/recommendations | Product recommendations |
| POST | /explain/fraud | SHAP-based feature attribution |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODELS_DIR` | `../models` | Path to model files |
| `PORT` | `8001` | Service port |

## Next.js Integration

Set `ML_INFERENCE_URL=http://localhost:8001` in your `.env.local`.

When the service is offline, all ML routes fall back to the statistical heuristic engine automatically — zero downtime.

## Deployment

Deploy to Railway, Render, or Fly.io:
```bash
# Railway
railway login && railway up

# Fly.io
fly launch --dockerfile Dockerfile
```

Point `ML_INFERENCE_URL` in your Vercel environment to the deployed service URL.
