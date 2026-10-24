// src/components/dashboard/SmartRecommendationsPanel.tsx
import React, { useState } from 'react';
import { SmartRecommendation } from '../../types';
import { Sparkles, AlertTriangle, Layers, TrendingDown, ArrowRight, CheckCircle2, ShieldAlert, DollarSign, Filter } from 'lucide-react';

interface SmartRecommendationsPanelProps {
  recommendations: SmartRecommendation[];
  onTakeAction?: (recommendation: SmartRecommendation) => void;
  onDismiss?: (recommendationId: string) => void;
}

export const SmartRecommendationsPanel: React.FC<SmartRecommendationsPanelProps> = ({
  recommendations,
  onTakeAction,
  onDismiss
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeRecs = recommendations.filter(r => !dismissedIds.has(r.id));

  const filteredRecs = activeRecs.filter(r => {
    if (filterType === 'all') return true;
    if (filterType === 'stockout') return r.type === 'stockout_risk' || r.type === 'reorder';
    if (filterType === 'overstock') return r.type === 'overstock';
    if (filterType === 'optimization') return r.type === 'optimization' || r.type === 'slow_moving';
    return true;
  });

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, id]));
    if (onDismiss) onDismiss(id);
  };

  const getSeverityStyle = (severity: SmartRecommendation['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-200 hover:border-red-300',
          bg: 'bg-red-50/50 hover:bg-red-50/80',
          badgeBg: 'bg-red-500 text-white',
          iconColor: 'text-red-600',
          Icon: ShieldAlert
        };
      case 'warning':
        return {
          border: 'border-amber-200 hover:border-amber-300',
          bg: 'bg-amber-50/50 hover:bg-amber-50/80',
          badgeBg: 'bg-amber-500 text-white',
          iconColor: 'text-amber-600',
          Icon: AlertTriangle
        };
      case 'info':
        return {
          border: 'border-blue-200 hover:border-blue-300',
          bg: 'bg-blue-50/40 hover:bg-blue-50/70',
          badgeBg: 'bg-blue-500 text-white',
          iconColor: 'text-blue-600',
          Icon: Layers
        };
      case 'success':
      default:
        return {
          border: 'border-emerald-200 hover:border-emerald-300',
          bg: 'bg-emerald-50/40 hover:bg-emerald-50/70',
          badgeBg: 'bg-emerald-600 text-white',
          iconColor: 'text-emerald-600',
          Icon: Sparkles
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Inventory Health Intelligence</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500">Autonomous stock recommendations & optimization opportunities</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium text-slate-600 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            All ({activeRecs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('stockout')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterType === 'stockout' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Stockouts
          </button>
          <button
            type="button"
            onClick={() => setFilterType('overstock')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterType === 'overstock' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Overstock
          </button>
          <button
            type="button"
            onClick={() => setFilterType('optimization')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterType === 'optimization' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Insights
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredRecs.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-800">All AI Suggestions Reviewed</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Your stock parameters are currently aligned with predicted sales demand. Check back as new POS transactions flow in!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRecs.map((rec) => {
            const style = getSeverityStyle(rec.severity);
            const Icon = style.Icon;

            return (
              <div
                key={rec.id}
                className={`relative rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${style.border} ${style.bg} group`}
              >
                <div>
                  {/* Top row: badge + dismiss */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${style.iconColor} shrink-0`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.badgeBg}`}>
                        {rec.type.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDismiss(rec.id, e)}
                      title="Dismiss insight"
                      className="text-slate-400 hover:text-slate-600 p-1 text-xs rounded-md hover:bg-white/80 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {rec.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                </div>

                {/* Bottom Impact & Action */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{rec.impactMetric}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTakeAction && onTakeAction(rec)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95"
                  >
                    <span>{rec.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Autonomous Inventory Health Model v2.4 Active
        </span>
        <span className="text-slate-400">Updates live after each invoice</span>
      </div>
    </div>
  );
};
