'use client';

import { RiskSeverity } from '@/lib/ml/types';

interface RiskScoreGaugeProps {
  score: number;         // 0-1
  severity: RiskSeverity;
  confidence?: number;   // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const SIZE_CONFIG = {
  sm: { r: 32, stroke: 5, textSize: 'text-lg', labelSize: 'text-[10px]', viewBox: '0 0 80 80' },
  md: { r: 44, stroke: 7, textSize: 'text-2xl', labelSize: 'text-xs', viewBox: '0 0 108 108' },
  lg: { r: 60, stroke: 9, textSize: 'text-3xl', labelSize: 'text-sm', viewBox: '0 0 144 144' },
};

function severityColor(s: RiskSeverity): string {
  switch (s) {
    case 'CRITICAL': return '#ef4444'; // red-500
    case 'HIGH':     return '#f97316'; // orange-500
    case 'MEDIUM':   return '#eab308'; // yellow-500
    case 'LOW':      return '#22c55e'; // green-500
  }
}

function severityGlow(s: RiskSeverity): string {
  switch (s) {
    case 'CRITICAL': return 'drop-shadow(0 0 8px rgba(239,68,68,0.6))';
    case 'HIGH':     return 'drop-shadow(0 0 8px rgba(249,115,22,0.6))';
    case 'MEDIUM':   return 'drop-shadow(0 0 8px rgba(234,179,8,0.5))';
    case 'LOW':      return 'drop-shadow(0 0 6px rgba(34,197,94,0.5))';
  }
}

export default function RiskScoreGauge({
  score,
  severity,
  confidence,
  size = 'md',
  showLabel = true,
  label,
}: RiskScoreGaugeProps) {
  const cfg = SIZE_CONFIG[size];
  const cx = cfg.r + cfg.stroke + 4;
  const cy = cx;

  // Arc: 270 degrees (from bottom-left, sweeping around, to bottom-right)
  const startAngle = -225 * (Math.PI / 180); // 225° from 3 o'clock
  const endAngle = 45 * (Math.PI / 180);     // 45° from 3 o'clock
  const totalAngle = endAngle - startAngle;

  const circumference = 2 * Math.PI * cfg.r;
  // We draw a 270-deg arc using stroke-dasharray trick
  const arcLen = (270 / 360) * circumference;
  const fillLen = score * arcLen;
  const gap = circumference - arcLen;

  const color = severityColor(severity);
  const glow = severityGlow(severity);

  const pct = Math.round(score * 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: cx * 2, height: cx * 2 }}>
        <svg
          viewBox={`0 0 ${cx * 2} ${cx * 2}`}
          width={cx * 2}
          height={cx * 2}
          style={{ transform: 'rotate(135deg)' }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={cfg.r}
            fill="none"
            stroke="#1e293b"
            strokeWidth={cfg.stroke}
            strokeDasharray={`${arcLen} ${circumference - arcLen}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx={cx}
            cy={cy}
            r={cfg.r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeDasharray={`${fillLen} ${circumference - fillLen}`}
            strokeLinecap="round"
            style={{ filter: glow, transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${cfg.textSize} font-bold tabular-nums`} style={{ color }}>
            {pct}
          </span>
          {showLabel && (
            <span className={`${cfg.labelSize} font-medium text-slate-400`}>
              {label ?? severity}
            </span>
          )}
          {confidence !== undefined && (
            <span className="text-[9px] text-slate-600 mt-0.5">
              {(confidence * 100).toFixed(0)}% conf.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
