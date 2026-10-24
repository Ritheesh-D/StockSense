// src/components/dashboard/InventoryHealthGauge.tsx
// Modern radial Inventory Health Score gauge with percentage breakdowns

import React from 'react';
import { ShieldCheck, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { InventoryHealthMetrics } from '../../types';

interface InventoryHealthGaugeProps {
  metrics: InventoryHealthMetrics;
  onExploreDetails?: () => void;
}

export const InventoryHealthGauge: React.FC<InventoryHealthGaugeProps> = ({
  metrics,
  onExploreDetails
}) => {
  const { healthScore, grade, healthyPercent, overstockPercent, understockPercent, deadStockPercent } = metrics;

  // Calculate SVG arc parameters (half circle gauge from 180 to 360 deg)
  const radius = 70;
  const circumference = Math.PI * radius; // 180 degree semi-circle
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Success emerald
    if (score >= 60) return '#F59E0B'; // Warning amber
    return '#EF4444'; // Danger red
  };

  const getScoreBadgeBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  const scoreColor = getScoreColor(healthScore);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Inventory Health Intelligence</h3>
            <p className="text-[11px] text-slate-500">Autonomous stock health evaluation</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getScoreBadgeBg(healthScore)} flex items-center gap-1`}>
          <span>Grade {grade}</span>
        </span>
      </div>

      {/* Radial Semi-Circle Gauge */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <svg width="190" height="110" viewBox="0 0 180 100" className="overflow-visible">
          {/* Background Arc */}
          <path
            d="M 20,90 A 70,70 0 0,1 160,90"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <path
            d="M 20,90 A 70,70 0 0,1 160,90"
            fill="none"
            stroke={scoreColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Display */}
        <div className="absolute top-[48px] flex flex-col items-center text-center">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {healthScore}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-0.5">/100</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Health Score
          </span>
        </div>
      </div>

      {/* 4 Health Metrics Breakdown Tags */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        {/* Healthy % */}
        <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Healthy
          </div>
          <span className="text-sm font-extrabold text-emerald-700 font-mono block mt-0.5">
            {healthyPercent}%
          </span>
        </div>

        {/* Overstock % */}
        <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Overstock
          </div>
          <span className="text-sm font-extrabold text-amber-700 font-mono block mt-0.5">
            {overstockPercent}%
          </span>
        </div>

        {/* Understock % */}
        <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Understock
          </div>
          <span className="text-sm font-extrabold text-rose-700 font-mono block mt-0.5">
            {understockPercent}%
          </span>
        </div>

        {/* Dead Stock % */}
        <div className="bg-slate-100/70 p-2 rounded-xl border border-slate-200 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            Dead Stock
          </div>
          <span className="text-sm font-extrabold text-slate-800 font-mono block mt-0.5">
            {deadStockPercent}%
          </span>
        </div>
      </div>

      {onExploreDetails && (
        <button
          onClick={onExploreDetails}
          className="w-full mt-3 pt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 border-t border-slate-50 transition-colors"
        >
          <span>View Detailed Risk Breakdown</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
