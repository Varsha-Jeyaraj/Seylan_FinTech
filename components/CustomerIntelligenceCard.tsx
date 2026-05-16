'use client';

import { CustomerIntelligence } from '@/lib/ml/segmentation-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { User, TrendingUp, TrendingDown, Star, ShieldCheck, AlertCircle, Lightbulb } from 'lucide-react';

interface CustomerIntelligenceCardProps {
  intelligence: CustomerIntelligence;
  userName?: string;
  className?: string;
}

function ScoreRow({ label, value, colorClass, Icon }: {
  label: string;
  value: number;
  colorClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-3.5 w-3.5 ${colorClass} flex-shrink-0`} />
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-200 font-mono">{(value * 100).toFixed(0)}%</span>
        </div>
        <Progress value={value * 100} className="h-1" />
      </div>
    </div>
  );
}

const SEGMENT_COLORS: Record<string, string> = {
  'Premium Elite':      'bg-amber-700 text-amber-100',
  'Wealth Builder':     'bg-violet-700 text-violet-100',
  'Digital Native':     'bg-blue-700 text-blue-100',
  'Conservative Saver': 'bg-emerald-700 text-emerald-100',
  'Value Seeker':       'bg-slate-600 text-slate-100',
};

export default function CustomerIntelligenceCard({
  intelligence,
  userName,
  className = '',
}: CustomerIntelligenceCardProps) {
  const seg = intelligence.segment;
  const badgeClass = SEGMENT_COLORS[seg.segment_name] ?? 'bg-slate-600 text-slate-100';

  return (
    <Card className={`bg-slate-900 border-slate-700 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="h-4 w-4 text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-sm text-white">{userName ?? 'Customer Profile'}</CardTitle>
              <p className="text-xs text-slate-500">AI Intelligence Report</p>
            </div>
          </div>
          <Badge className={badgeClass}>{seg.segment_name}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Segment confidence */}
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-1">Segment Confidence</p>
          <div className="flex items-center gap-2">
            <Progress value={seg.segment_confidence * 100} className="h-1.5 flex-1" />
            <span className="text-xs font-mono text-slate-300 w-10 text-right">
              {(seg.segment_confidence * 100).toFixed(0)}%
            </span>
          </div>
          {seg.segment_characteristics.length > 0 && (
            <dl className="mt-2 space-y-1">
              {seg.segment_characteristics.map((c) => (
                <div key={c.label} className="flex justify-between text-xs">
                  <dt className="text-slate-500">{c.label}</dt>
                  <dd className="text-slate-300 font-medium">{c.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Customer scores */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Customer Scores</p>
          <ScoreRow label="Behaviour Score" value={intelligence.behaviour_score} colorClass="text-blue-400" Icon={ShieldCheck} />
          <ScoreRow label="Lifetime Value" value={intelligence.value_score} colorClass="text-emerald-400" Icon={TrendingUp} />
          <ScoreRow label="Churn Risk" value={intelligence.churn_risk} colorClass="text-red-400" Icon={TrendingDown} />
          <ScoreRow label="Upsell Readiness" value={intelligence.upsell_readiness} colorClass="text-amber-400" Icon={Star} />
        </div>

        <Separator className="bg-slate-700" />

        {/* AI Insights */}
        {intelligence.insights.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-400" />
              AI Insights
            </p>
            <ul className="space-y-1.5">
              {intelligence.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">›</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Spending trends mini-chart */}
        {intelligence.spending_trends.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Spending Trend</p>
            <div className="flex items-end gap-1 h-12">
              {intelligence.spending_trends.slice(0, 4).map((trend, i) => {
                const maxTrend = Math.max(...intelligence.spending_trends.map((t) => t.total), 1);
                const height = (trend.total / maxTrend) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-t-sm bg-violet-600 transition-all duration-500"
                      style={{ height: `${height}%`, minHeight: 2 }}
                      title={`${trend.period}: LKR ${trend.total.toLocaleString()}`}
                    />
                    <span className="text-[9px] text-slate-600">{trend.period}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
