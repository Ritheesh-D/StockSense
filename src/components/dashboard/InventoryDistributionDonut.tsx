// src/components/dashboard/InventoryDistributionDonut.tsx
import React, { useState } from 'react';
import { InventoryHealthMetrics, ProductHealthAnalysis } from '../../types';
import { PieChart, Info, ShieldCheck, AlertTriangle, AlertOctagon, Layers } from 'lucide-react';

interface InventoryDistributionDonutProps {
  metrics: InventoryHealthMetrics;
  analyses: ProductHealthAnalysis[];
  onSelectCategory?: (category: 'HEALTHY' | 'OVERSTOCK' | 'UNDERSTOCK' | 'CRITICAL' | null) => void;
}

export const InventoryDistributionDonut: React.FC<InventoryDistributionDonutProps> = ({
  metrics,
  analyses,
  onSelectCategory
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);

  // Group analyses by categories
  const healthyCount = analyses.filter(a => a.healthStatus === 'HEALTHY').length;
  const overstockCount = analyses.filter(a => a.healthStatus === 'OVERSTOCK').length;
  const lowStockCount = analyses.filter(a => a.healthStatus === 'UNDERSTOCK' || a.healthStatus === 'SLOW_MOVING').length;
  const criticalCount = analyses.filter(a => a.healthStatus === 'CRITICAL' || a.healthStatus === 'DEAD_STOCK').length;

  const total = Math.max(analyses.length, 1);

  const slices = [
    {
      id: 'HEALTHY',
      label: 'Healthy Stock',
      count: healthyCount,
      percent: Math.round((healthyCount / total) * 100),
      color: '#10B981', // Emerald
      icon: ShieldCheck,
      description: 'Optimal turnover & safe coverage'
    },
    {
      id: 'OVERSTOCK',
      label: 'Overstocked',
      count: overstockCount,
      percent: Math.round((overstockCount / total) * 100),
      color: '#3B82F6', // Blue
      icon: Layers,
      description: 'Exceeds maximum buffer; idle capital'
    },
    {
      id: 'UNDERSTOCK',
      label: 'Low Stock',
      count: lowStockCount,
      percent: Math.round((lowStockCount / total) * 100),
      color: '#F59E0B', // Amber
      icon: AlertTriangle,
      description: 'Below min reorder threshold'
    },
    {
      id: 'CRITICAL',
      label: 'Critical / Stockout',
      count: criticalCount,
      percent: Math.round((criticalCount / total) * 100),
      color: '#EF4444', // Red
      icon: AlertOctagon,
      description: 'Immediate stockout or dead inventory'
    }
  ];

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeAngle = 0;
  const slicePaths = slices.map((slice) => {
    const fraction = slice.count / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += fraction;

    return {
      ...slice,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const handleSliceClick = (id: string) => {
    const next = selectedSlice === id ? null : id;
    setSelectedSlice(next);
    if (onSelectCategory) {
      onSelectCategory(next as any);
    }
  };

  const active = hoveredSlice ? slices.find(s => s.id === hoveredSlice) : (selectedSlice ? slices.find(s => s.id === selectedSlice) : null);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Inventory Distribution</h3>
            <p className="text-xs text-slate-500">Stock health portfolio breakdown</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
          {total} SKUs
        </span>
      </div>

      {/* Donut Chart & Center Stats */}
      <div className="flex flex-col sm:flex-row items-center gap-5 justify-center py-2">
        <div className="relative w-[180px] h-[180px] flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slicePaths.map((slice) => (
              <circle
                key={slice.id}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={hoveredSlice === slice.id || selectedSlice === slice.id ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                onClick={() => handleSliceClick(slice.id)}
              />
            ))}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
            {active ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {active.label.split(' ')[0]}
                </span>
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {active.percent}%
                </span>
                <span className="text-[11px] text-slate-500">
                  {active.count} Products
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Portfolio</span>
                <span className="text-2xl font-bold tracking-tight text-slate-900">{total}</span>
                <span className="text-[11px] font-medium text-emerald-600">{metrics.healthyPercent}% Healthy</span>
              </>
            )}
          </div>
        </div>

        {/* Legend / Metrics Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 w-full max-w-xs">
          {slices.map((slice) => {
            const isSelected = selectedSlice === slice.id;
            const isHovered = hoveredSlice === slice.id;
            return (
              <button
                key={slice.id}
                type="button"
                onClick={() => handleSliceClick(slice.id)}
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`text-left p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                    : isHovered
                    ? 'border-slate-300 bg-slate-50'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{slice.label}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{slice.count} SKUs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">{slice.percent}%</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          Click any segment to filter inventory list
        </span>
        {selectedSlice && (
          <button
            onClick={() => handleSliceClick(selectedSlice)}
            className="text-blue-600 font-semibold hover:underline"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
};
