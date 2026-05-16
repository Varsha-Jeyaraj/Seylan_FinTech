/**
 * K-Means Clustering implementation for Customer Segmentation
 * Used to classify users into risk and opportunity segments.
 */

export interface CustomerDataPoint {
  id: string;
  monthly_income: number;
  credit_score: number;
  monthly_spends: number;
  existing_loan_amount: number;
}

export interface ClusterCentroid {
  id: number;
  name: string;
  features: number[]; // [income, credit_score, spends, loan]
}

// Pre-trained centroids for deterministic behavior in demo
// Normalized features: [income (0-10k+), credit_score (300-850), spends (0-10k+), loan (0-50k+)]
export const INITIAL_CENTROIDS: ClusterCentroid[] = [
  { id: 0, name: 'High-Net-Worth Individual', features: [8000, 780, 4000, 5000] },
  { id: 1, name: 'Conservative Saver', features: [5000, 750, 1500, 1000] },
  { id: 2, name: 'Young Professional', features: [3500, 680, 2500, 8000] },
  { id: 3, name: 'Credit Builder', features: [2000, 550, 1800, 15000] },
];

export function normalize(value: number, min: number, max: number) {
  return (Math.max(min, Math.min(max, value)) - min) / (max - min);
}

export function extractFeatures(customer: CustomerDataPoint): number[] {
  return [
    customer.monthly_income,
    customer.credit_score,
    customer.monthly_spends,
    customer.existing_loan_amount
  ];
}

export function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

export function assignToCluster(customer: CustomerDataPoint, centroids: ClusterCentroid[] = INITIAL_CENTROIDS): ClusterCentroid {
  const features = extractFeatures(customer);
  
  let closestCentroid = centroids[0];
  let minDistance = Infinity;

  for (const centroid of centroids) {
    const distance = euclideanDistance(features, centroid.features);
    if (distance < minDistance) {
      minDistance = distance;
      closestCentroid = centroid;
    }
  }

  return closestCentroid;
}

/**
 * Advanced K-Means (For batch training)
 */
export function trainKMeans(data: CustomerDataPoint[], k: number = 4, iterations: number = 10): ClusterCentroid[] {
  if (data.length === 0) return INITIAL_CENTROIDS;
  
  // Initialize random centroids from data points
  let centroids: ClusterCentroid[] = Array.from({ length: k }).map((_, i) => ({
    id: i,
    name: `Cluster ${i}`,
    features: extractFeatures(data[Math.floor(Math.random() * data.length)])
  }));

  for (let iter = 0; iter < iterations; iter++) {
    const assignments: { [key: number]: number[][] } = {};
    for (let i = 0; i < k; i++) assignments[i] = [];

    // Assign points
    for (const point of data) {
      const features = extractFeatures(point);
      let closestIdx = 0;
      let minDistance = Infinity;
      
      centroids.forEach((centroid, idx) => {
        const dist = euclideanDistance(features, centroid.features);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });
      
      assignments[closestIdx].push(features);
    }

    // Update centroids
    centroids = centroids.map((centroid, idx) => {
      const clusterPoints = assignments[idx];
      if (clusterPoints.length === 0) return centroid;

      const newFeatures = centroid.features.map((_, featureIdx) => {
        const sum = clusterPoints.reduce((acc, point) => acc + point[featureIdx], 0);
        return sum / clusterPoints.length;
      });

      return { ...centroid, features: newFeatures };
    });
  }

  return centroids;
}
