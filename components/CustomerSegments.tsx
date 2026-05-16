'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomerSegment } from '@/lib/supabase';
import { Users, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CustomerSegments() {
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const formatLkr = (amount: number) => `LKR ${amount.toLocaleString()}`;

  useEffect(() => {
    loadSegments();
  }, []);

  async function loadSegments() {
    try {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .order('cluster_id');

      if (error) throw error;
      setSegments(data || []);
    } catch (error) {
      console.error('[v0] Error loading segments:', error);
    } finally {
      setLoading(false);
    }
  }

  const segmentColors = {
    1: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
    2: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
    3: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    4: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  };

  if (loading) {
    return (
      <Card className="border-slate-700 bg-slate-900">
        <div className="px-6 py-8 text-center">
          <p className="text-slate-400">Loading segments...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-900">
      <div className="border-b border-slate-700 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Users className="h-5 w-5 text-indigo-500" />
          Customer Segments
        </h2>
      </div>

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {segments.map((segment) => {
          const colors = segmentColors[segment.cluster_id as keyof typeof segmentColors] || segmentColors[1];
          const chars = segment.characteristics as Record<string, any>;

          return (
            <div
              key={segment.id}
              className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4`}
            >
              <h3 className={`font-semibold ${colors.text}`}>{segment.cluster_name}</h3>

              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {chars.avg_balance && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Balance:</span>
                    <span className="font-medium">{formatLkr(chars.avg_balance)}</span>
                  </div>
                )}

                {chars.transaction_frequency && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Frequency:</span>
                    <span className="font-medium capitalize">{chars.transaction_frequency}</span>
                  </div>
                )}

                {chars.preferred_products && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-slate-400">Preferred Products:</p>
                    <div className="flex flex-wrap gap-1">
                      {chars.preferred_products.slice(0, 3).map((product: string, idx: number) => (
                        <span key={idx} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
                          {product.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded bg-slate-800/50 px-3 py-2 text-xs">
                <TrendingUp className="h-3 w-3 text-slate-400" />
                <span className="text-slate-300">
                  {segment.cluster_id === 1 ? 'High-Value' : segment.cluster_id === 2 ? 'Standard' : segment.cluster_id === 3 ? 'Basic' : 'High-Risk'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
