// src/components/dashboard/PriorityReorderList.tsx
import React, { useState } from 'react';
import { ProductHealthAnalysis } from '../../types';
import { AlertCircle, ShoppingCart, TrendingUp, Package, ArrowUpDown, ChevronRight, Zap } from 'lucide-react';

interface PriorityReorderListProps {
  analyses: ProductHealthAnalysis[];
  onReorder?: (analysis: ProductHealthAnalysis) => void;
  onViewProduct?: (productId: string) => void;
}

export const PriorityReorderList: React.FC<PriorityReorderListProps> = ({
  analyses,
  onReorder,
  onViewProduct
}) => {
  const [sortBy, setSortBy] = useState<'risk' | 'urgency' | 'velocity'>('risk');

  // Filter products needing reorder (critical, understock, or low days of coverage)
  const reorderCandidates = analyses
    .filter(a => a.healthStatus === 'CRITICAL' || a.healthStatus === 'UNDERSTOCK' || a.daysOfCoverage <= 10)
    .sort((a, b) => {
      if (sortBy === 'risk') {
        return b.riskScore - a.riskScore;
      }
      if (sortBy === 'urgency') {
        return a.daysOfCoverage - b.daysOfCoverage;
      }
      return b.velocity - a.velocity;
    });

  // Top 6 priority items for clean mobile card view
  const topList = reorderCandidates.slice(0, 6);

  const getUrgencyBadge = (days: number, stock: number) => {
    if (stock === 0) {
      return { label: 'Stockout', bg: 'bg-red-100 text-red-800 border-red-200' };
    }
    if (days <= 2) {
      return { label: `${days}d left`, bg: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
    if (days <= 5) {
      return { label: `${days}d buffer`, bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: `${days}d coverage`, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Priority Reorder List</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-red-500 text-white">
                {reorderCandidates.length} At Risk
              </span>
            </div>
            <p className="text-xs text-slate-500">Ranked by risk score, sales velocity & stockout days</p>
          </div>
        </div>

        {/* Sort Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium text-slate-600 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSortBy('risk')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'risk' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Risk Score
          </button>
          <button
            type="button"
            onClick={() => setSortBy('urgency')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'urgency' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Urgency
          </button>
          <button
            type="button"
            onClick={() => setSortBy('velocity')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              sortBy === 'velocity' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Velocity
          </button>
        </div>
      </div>

      {/* List items */}
      {topList.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Package className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800">All Reorder Levels Optimal</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Zero products currently breach reorder safety thresholds. Great inventory control!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {topList.map((item) => {
            const urgency = getUrgencyBadge(item.daysOfCoverage, item.currentStock);
            const suggestedReorderQty = Math.max(item.maxStock - item.currentStock, Math.round(item.velocity * 14));

            return (
              <div
                key={item.productId}
                className="group p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Product Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border font-mono ${
                    item.riskScore >= 80
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <span className="text-[10px] uppercase font-bold leading-none">Risk</span>
                    <span className="text-xs font-bold">{item.riskScore}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onViewProduct && onViewProduct(item.productId)}
                        className="text-xs font-bold text-slate-900 hover:text-blue-600 truncate text-left"
                      >
                        {item.name}
                      </button>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${urgency.bg}`}>
                        {urgency.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="text-slate-400">Stock:</span>
                        <strong className={item.currentStock <= item.minStock ? 'text-red-600 font-bold' : 'text-slate-700'}>
                          {item.currentStock}
                        </strong>
                        <span className="text-slate-400">/ min {item.minStock}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span>{item.velocity.toFixed(1)}/day</span>
                      </span>

                      <span className="text-slate-400 hidden sm:inline">•</span>
                      <span className="text-slate-500 truncate hidden sm:inline">{item.category}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Reorder Action */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Suggested</div>
                    <div className="text-xs font-bold text-slate-800">+{suggestedReorderQty} units</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReorder && onReorder(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Reorder</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      {reorderCandidates.length > 6 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing top 6 priority items ({reorderCandidates.length} total needing replenishment)</span>
          <span className="text-blue-600 font-semibold cursor-pointer hover:underline flex items-center gap-1">
            View All in Inventory <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      )}
    </div>
  );
};
