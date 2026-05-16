'use client';

import { useState } from 'react';
import { RecommendationItem } from '@/lib/ml/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sparkles, CreditCard, PiggyBank, TrendingUp, Shield, Globe, ChevronRight } from 'lucide-react';

interface AIRecommendationWidgetProps {
  recommendations: RecommendationItem[];
  isLoading?: boolean;
  userName?: string;
}

const PRODUCT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  credit_card: CreditCard,
  savings: PiggyBank,
  investment: TrendingUp,
  wealth: TrendingUp,
  insurance: Shield,
  deposit: PiggyBank,
  default: Globe,
};

function confidenceColor(c: number): string {
  if (c >= 0.9) return 'bg-emerald-700 text-emerald-100';
  if (c >= 0.75) return 'bg-blue-700 text-blue-100';
  return 'bg-slate-600 text-slate-200';
}

export default function AIRecommendationWidget({
  recommendations,
  isLoading,
  userName,
}: AIRecommendationWidgetProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-800 animate-pulse rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">No recommendations available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              AI Recommendations
            </CardTitle>
            {userName && (
              <CardDescription className="text-xs mt-0.5">Personalised for {userName}</CardDescription>
            )}
          </div>
          <Badge className="bg-violet-700 text-violet-100 text-xs">{recommendations.length} offers</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {recommendations.map((rec, i) => {
          const Icon = PRODUCT_ICONS[rec.product_type] ?? PRODUCT_ICONS.default;
          const isOpen = expanded === rec.product_type;

          return (
            <div
              key={rec.product_type}
              className={`rounded-lg border transition-all duration-200 cursor-pointer ${
                isOpen ? 'bg-slate-800 border-violet-700' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
              onClick={() => setExpanded(isOpen ? null : rec.product_type)}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{rec.product_name}</p>
                  <p className="text-xs text-slate-500 truncate">{rec.product_type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={`${confidenceColor(rec.confidence)} text-xs`}>
                    {(rec.confidence * 100).toFixed(0)}%
                  </Badge>
                  <ChevronRight
                    className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 pt-0 border-t border-slate-700">
                  <p className="text-xs text-slate-300 leading-relaxed mt-2">{rec.reasoning}</p>
                  <Button
                    size="sm"
                    className="mt-3 w-full h-7 text-xs bg-violet-700 hover:bg-violet-600 text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rec.cta}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
