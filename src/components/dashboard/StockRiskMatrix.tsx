// src/components/dashboard/StockRiskMatrix.tsx
// Interactive 4-Quadrant Stock Risk Matrix (X: Velocity, Y: Current Stock)

import React, { useState } from 'react';
import { ProductHealthAnalysis, RiskQuadrant } from '../../types';
import { AlertCircle, AlertTriangle, CheckCircle, Package, ArrowRight, Info } from 'lucide-react';

interface StockRiskMatrixProps {
  analyses: ProductHealthAnalysis[];
  onSelectProduct?: (productId: string) => void;
  onQuickReorder?: (product: ProductHealthAnalysis) => void;
}

export const StockRiskMatrix: React.FC<StockRiskMatrixProps> = ({
  analyses,
  onSelectProduct,
  onQuickReorder
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<RiskQuadrant | 'All'>('All');
  const [activeItem, setActiveItem] = useState<ProductHealthAnalysis | null>(null);

  const quadrants: Array<{
    id: RiskQuadrant;
    title: string;
    description: string;
    badgeBg: string;
    textColor: string;
    borderColor: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'Critical',
      title: 'Critical Risk',
      description: 'High velocity + Low stock (Stockout imminent)',
      badgeBg: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-200',
      icon: AlertCircle
    },
    {
      id: 'Overstocked',
      title: 'Overstocked',
      description: 'Low velocity + High stock (Capital locked)',
      badgeBg: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
      icon: AlertTriangle
    },
    {
      id: 'Low Stock',
      title: 'Low Stock',
      description: 'Low velocity + Low stock (Monitor demand)',
      badgeBg: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      icon: Package
    },
    {
      id: 'Balanced',
      title: 'Balanced',
      description: 'Optimal stock + Healthy velocity',
      badgeBg: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      icon: CheckCircle
    }
  ];

  const getQuadrantItems = (quadrant: RiskQuadrant) => {
    return analyses.filter(a => a.quadrant === quadrant);
  };

  const filteredItems = selectedQuadrant === 'All'
    ? analyses
    : analyses.filter(a => a.quadrant === selectedQuadrant);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Stock Risk Matrix</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Interactive
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            X-Axis: Demand Velocity • Y-Axis: Stock Coverage
          </p>
        </div>

        {/* Quadrant Quick Filter Pills */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedQuadrant('All')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedQuadrant === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({analyses.length})
          </button>
          {quadrants.map(q => {
            const count = getQuadrantItems(q.id).length;
            const isSelected = selectedQuadrant === q.id;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedQuadrant(q.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  isSelected
                    ? `${q.badgeBg} ${q.textColor} border ${q.borderColor} font-bold ring-2 ring-blue-500/20`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{q.id}</span>
                <span className="font-mono text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Quadrants Interactive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {quadrants.map(q => {
          const items = getQuadrantItems(q.id);
          const Icon = q.icon;
          const isHighlighted = selectedQuadrant === 'All' || selectedQuadrant === q.id;

          return (
            <div
              key={q.id}
              onClick={() => setSelectedQuadrant(q.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isHighlighted
                  ? `${q.badgeBg} ${q.borderColor} shadow-xs`
                  : 'bg-slate-50/50 border-slate-100 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${q.textColor}`} />
                  <span className={`text-xs font-bold ${q.textColor}`}>{q.title}</span>
                </div>
                <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-full bg-white/90 border ${q.borderColor} ${q.textColor}`}>
                  {items.length} item{items.length === 1 ? '' : 's'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-2 leading-tight">
                {q.description}
              </p>

              {/* Top Items Chips */}
              <div className="flex flex-wrap gap-1">
                {items.slice(0, 3).map(item => (
                  <button
                    key={item.productId}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveItem(item);
                    }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white border border-slate-200/80 text-slate-800 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs truncate max-w-[140px]"
                  >
                    {item.name} ({item.currentStock})
                  </button>
                ))}
                {items.length > 3 && (
                  <span className="text-[10px] font-bold text-slate-400 px-1 py-1 self-center">
                    +{items.length - 3} more
                  </span>
                )}
                {items.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic">No products in this quadrant</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Item Mini Action Card (if clicked) */}
      {activeItem && (
        <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{activeItem.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                {activeItem.sku}
              </span>
            </div>
            <p className="text-xs text-blue-900 font-medium">{activeItem.recommendation}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono pt-1">
              <span>Stock: <strong className="text-slate-900">{activeItem.currentStock}</strong></span>
              <span>Velocity: <strong className="text-slate-900">{activeItem.velocity} u/day</strong></span>
              <span>Coverage: <strong className="text-slate-900">{activeItem.daysOfCoverage}d</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onQuickReorder && (
              <button
                type="button"
                onClick={() => onQuickReorder(activeItem)}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                Quick Reorder
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-white rounded-lg border border-slate-200 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
