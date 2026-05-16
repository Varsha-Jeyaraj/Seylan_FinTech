'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Transaction } from '@/lib/supabase';

interface FraudHeatmapProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getHeatColor(intensity: number): string {
  if (intensity === 0) return 'bg-slate-800/80';
  if (intensity < 0.2) return 'bg-violet-900/60';
  if (intensity < 0.4) return 'bg-violet-700/70';
  if (intensity < 0.6) return 'bg-orange-700/80';
  if (intensity < 0.8) return 'bg-orange-600';
  return 'bg-red-600';
}

export default function FraudHeatmap({ transactions, isLoading }: FraudHeatmapProps) {
  // Build a 7×24 grid of average fraud scores
  const heatGrid = useMemo(() => {
    const grid: { sum: number; count: number }[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ sum: 0, count: 0 }))
    );

    for (const tx of transactions) {
      if (!tx.fraud_score) continue;
      const d = new Date(tx.timestamp);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
      const hour = d.getHours();
      grid[dayIdx][hour].sum += tx.fraud_score;
      grid[dayIdx][hour].count += 1;
    }

    return grid.map((row) =>
      row.map((cell) => (cell.count > 0 ? cell.sum / cell.count : 0))
    );
  }, [transactions]);

  const maxVal = useMemo(() => Math.max(...heatGrid.flat(), 0.01), [heatGrid]);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Fraud Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-slate-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-sm">Fraud Activity Heatmap</CardTitle>
            <CardDescription className="text-xs">Average fraud score by day × hour</CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="flex gap-0.5 items-center">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
                <div key={v} className={`w-3 h-3 rounded-sm ${getHeatColor(v)}`} />
              ))}
            </div>
            <span>Low → High</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto pb-2">
        <TooltipProvider delayDuration={100}>
          <div className="min-w-[480px]">
            {/* Hour labels */}
            <div className="flex ml-8 mb-0.5">
              {HOURS.filter((_, i) => i % 4 === 0).map((h) => (
                <div
                  key={h}
                  className="text-[10px] text-slate-500"
                  style={{ width: `${(4 / 24) * 100}%`, textAlign: 'left' }}
                >
                  {h.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day, di) => (
              <div key={day} className="flex items-center gap-0.5 mb-0.5">
                <span className="w-7 text-[10px] text-slate-500 text-right pr-1">{day}</span>
                {HOURS.map((h) => {
                  const val = heatGrid[di][h];
                  const intensity = val / maxVal;
                  return (
                    <Tooltip key={h}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 h-4 rounded-[2px] cursor-default transition-all duration-300 hover:opacity-80 ${getHeatColor(intensity)}`}
                          style={{ minWidth: 4 }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-slate-800 border-slate-600 text-xs">
                        <p className="font-medium">{day} {h.toString().padStart(2, '0')}:00</p>
                        <p className="text-slate-300">
                          Avg fraud score: {val > 0 ? (val * 100).toFixed(1) + '%' : 'No data'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
