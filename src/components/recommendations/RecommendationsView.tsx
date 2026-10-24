// src/components/recommendations/RecommendationsView.tsx
import React, { useMemo } from 'react';
import { Product, Invoice, ReturnRecord, StoreSettings, SmartRecommendation, ProductHealthAnalysis } from '../../types';
import { HealthIntelligenceService } from '../../services/healthIntelligenceService';
import { SmartRecommendationsPanel } from '../dashboard/SmartRecommendationsPanel';
import { Sparkles, Zap, ShieldAlert, Layers, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface RecommendationsViewProps {
  products: Product[];
  invoices: Invoice[];
  returns?: ReturnRecord[];
  settings: StoreSettings;
  onNavigateTab: (tab: any) => void;
  onReorderProduct?: (analysis: ProductHealthAnalysis) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  products,
  invoices,
  returns = [],
  settings,
  onNavigateTab,
  onReorderProduct
}) => {
  const { metrics, analyses, recommendations } = useMemo(() => {
    return HealthIntelligenceService.calculateOverallMetrics(products, invoices, returns);
  }, [products, invoices, returns]);

  const handleAction = (rec: SmartRecommendation) => {
    if (rec.productId) {
      const item = analyses.find((a: ProductHealthAnalysis) => a.productId === rec.productId);
      if (item && onReorderProduct) {
        onReorderProduct(item);
        return;
      }
    }
    if (rec.actionType === 'reorder' || rec.actionType === 'create_po') {
      onNavigateTab('reorder');
    } else {
      onNavigateTab('inventory');
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/30 text-indigo-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Autonomous Intelligence Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Inventory Optimization Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Real-time actionable recommendations targeting stockout prevention, dead inventory clearance, and working capital efficiency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">Idle Capital</span>
              <span className="text-xl font-bold font-mono text-white">₹{metrics.capitalTiedInOverstock.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">Stockouts</span>
              <span className="text-xl font-bold font-mono text-white">{metrics.immediateStockoutCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Smart Recommendations Panel */}
      <SmartRecommendationsPanel
        recommendations={recommendations}
        onTakeAction={handleAction}
      />

      {/* 4 Pillars of Hackathon Inventory Intelligence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-2">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Runout Forecasting</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Detects velocity anomalies and warns when buffer days fall below supplier lead times.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Excess Storage Detection</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Identifies products holding over 40% excess stock relative to 60-day turnover velocity.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Reorder Prioritization</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Sorts purchase requisitions automatically by revenue contribution and stockout criticality.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900">Capital Optimization</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Minimizes dead stock write-offs through automated promotional clearance suggestions.
          </p>
        </div>
      </div>
    </div>
  );
};
