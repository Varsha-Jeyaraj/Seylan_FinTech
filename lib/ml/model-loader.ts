/**
 * Model Loader — bridge connectivity, metadata loading, and health checking.
 *
 * The Python inference service (inference/main.py) serves the .pkl models.
 * This module manages the connection to that service with caching and
 * graceful fallback when the bridge is offline.
 */

import { ModelInfo, ModelStatus, FeatureMetadata } from './types';

// ─── Config ──────────────────────────────────────────────────────────────────

const INFERENCE_URL =
  process.env.ML_INFERENCE_URL || 'http://localhost:8001';

const MODEL_NAMES = [
  'fraud_random_forest',
  'fraud_xgboost',
  'fraud_isolation_forest',
  'segmentation_model',
  'segmentation_scaler',
  'recommendation_model',
] as const;

export type ModelName = (typeof MODEL_NAMES)[number];

// ─── Singleton Cache ──────────────────────────────────────────────────────────

let _modelRegistry: Map<ModelName, ModelInfo> | null = null;
let _featureMetadata: FeatureMetadata | null = null;
let _lastHealthCheck = 0;
let _bridgeHealthy = false;
const HEALTH_CHECK_TTL_MS = 30_000;

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkInferenceBridge(): Promise<boolean> {
  const now = Date.now();
  if (now - _lastHealthCheck < HEALTH_CHECK_TTL_MS) return _bridgeHealthy;

  try {
    const res = await fetch(`${INFERENCE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
    _bridgeHealthy = res.ok;
  } catch {
    _bridgeHealthy = false;
  }

  _lastHealthCheck = now;
  return _bridgeHealthy;
}

// ─── Feature Metadata ─────────────────────────────────────────────────────────

/**
 * Returns feature metadata from the bridge.
 * Falls back to defaults derived from feature_metadata.json structure.
 */
export async function getFeatureMetadata(): Promise<FeatureMetadata> {
  if (_featureMetadata) return _featureMetadata;

  const healthy = await checkInferenceBridge();
  if (healthy) {
    try {
      const res = await fetch(`${INFERENCE_URL}/metadata`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        _featureMetadata = await res.json();
        return _featureMetadata!;
      }
    } catch {
      // fall through to defaults
    }
  }

  // Defaults matching the v3.0_enterprise_scale training pipeline
  _featureMetadata = {
    fraud_features: [
      'amount', 'hour', 'device_mismatch', 'geo_risk_score',
      'merchant_risk_score', 'transaction_velocity', 'account_age_months',
      'credit_score', 'balance_before', 'balance_after', 'merchant_category_encoded',
    ],
    segmentation_features: [
      'monthly_income', 'savings_ratio', 'account_age_months', 'credit_score', 'avg_balance',
    ],
    recommendation_features: [
      'monthly_income', 'savings_ratio', 'account_age_months', 'credit_score', 'avg_balance', 'cluster',
    ],
    cluster_names: {
      '0': 'High Value Professional',
      '1': 'Young Saver',
      '2': 'SME Growth Customer',
      '3': 'Premium Banking User',
      '4': 'Risk-Sensitive Spender',
    },
    merchant_categories: [
      'Groceries', 'Travel', 'Luxury', 'Electronics', 'Restaurants', 'Fuel',
      'Shopping', 'Healthcare', 'Utilities', 'Entertainment', 'Crypto Exchange', 'Jewelry',
    ],
    model_version: 'v3.0_enterprise_scale',
    training_date: new Date().toISOString(),
  };

  return _featureMetadata;
}

// ─── Model Registry ───────────────────────────────────────────────────────────

export async function initModelRegistry(): Promise<Map<ModelName, ModelInfo>> {
  if (_modelRegistry) return _modelRegistry;

  _modelRegistry = new Map();
  const healthy = await checkInferenceBridge();

  if (!healthy) {
    for (const name of MODEL_NAMES) {
      _modelRegistry.set(name, {
        name,
        version: 'N/A',
        status: 'fallback',
        error: 'Inference bridge offline — using statistical fallback',
      });
    }
    return _modelRegistry;
  }

  try {
    const res = await fetch(`${INFERENCE_URL}/models`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const data: { models: Array<{ name: ModelName; version: string; loaded: boolean }> } =
        await res.json();
      for (const m of data.models) {
        _modelRegistry.set(m.name, {
          name: m.name,
          version: m.version,
          status: m.loaded ? 'loaded' : 'unavailable',
          loadedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    for (const name of MODEL_NAMES) {
      _modelRegistry.set(name, {
        name,
        version: 'N/A',
        status: 'unavailable',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return _modelRegistry;
}

export async function getModelStatus(name: ModelName): Promise<ModelStatus> {
  const registry = await initModelRegistry();
  return registry.get(name)?.status ?? 'unavailable';
}

export async function getAllModelInfos(): Promise<ModelInfo[]> {
  const registry = await initModelRegistry();
  return Array.from(registry.values());
}

export function invalidateModelCache(): void {
  _modelRegistry = null;
  _featureMetadata = null;
  _lastHealthCheck = 0;
}

// ─── Inference Call Helper ────────────────────────────────────────────────────

export async function callInference<TReq, TRes>(
  endpoint: string,
  payload: TReq,
  timeoutMs = 10_000
): Promise<TRes | null> {
  const healthy = await checkInferenceBridge();
  if (!healthy) return null;

  try {
    const res = await fetch(`${INFERENCE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[ModelLoader] ${endpoint} returned ${res.status}: ${err}`);
      return null;
    }
    return res.json() as Promise<TRes>;
  } catch (err) {
    console.error(`[ModelLoader] ${endpoint} failed:`, err);
    return null;
  }
}
