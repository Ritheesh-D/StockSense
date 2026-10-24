// src/components/analytics/InventoryIntelligenceHub.tsx
import React, { useState, useMemo } from 'react';
import { Product, Invoice, ReturnRecord, StoreSettings, ProductHealthAnalysis } from '../../types';
import { HealthIntelligenceService } from '../../services/healthIntelligenceService';
import { InventoryHealthGauge } from '../dashboard/InventoryHealthGauge';
import { StockRiskMatrix } from '../dashboard/StockRiskMatrix';
import { InventoryDistributionDonut } from '../dashboard/InventoryDistributionDonut';
import { PriorityReorderList } from '../dashboard/PriorityReorderList';
import { 
  Activity, 
  Layers, 
  DollarSign, 
  AlertOctagon, 
  TrendingUp, 
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface InventoryIntelligenceHubProps {
  products: Product[];
  invoices: Invoice[];
  returns?: ReturnRecord[];
  settings: StoreSettings;
  onReorder?: (analysis: ProductHealthAnalysis) => void;
  onViewProduct?: (productId: string) => void;
}

export const InventoryIntelligenceHub: React.FC<InventoryIntelligenceHubProps> = ({
  products,
  invoices,
  returns = [],
  settings,
  onReorder,
  onViewProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { metrics, analyses } = useMemo(() => {
    return HealthIntelligenceService.calculateOverallMetrics(products, invoices, returns);
  }, [products, invoices, returns]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredAnalyses = useMemo(() => {
    if (selectedCategory === 'all') return analyses;
    return analyses.filter((a: ProductHealthAnalysis) => a.category === selectedCategory);
  }, [analyses, selectedCategory]);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Intelligence Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Inventory Health Intelligence</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                Actionable Visualizations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Replaces passive forecasting with live stock risk quadrants, reorder priorities & capital health scores.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Value Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Health Index</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">{metrics.healthScore}</span>
            <span className="text-xs font-bold text-emerald-600">Grade {metrics.grade}</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">{metrics.healthyPercent}% Healthy SKUs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">Immediate Risk</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-red-600 font-mono">{metrics.immediateStockoutCount}</span>
            <span className="text-xs text-slate-400">SKUs</span>
          </div>
          <span className="text-[11px] text-red-600 mt-1 block">Critical or Out of Stock</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Overstock Buffer</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-blue-600 font-mono">{metrics.overstockedCount}</span>
            <span className="text-xs text-slate-400">SKUs</span>
          </div>
          <span className="text-[11px] text-blue-600 mt-1 block">₹{metrics.capitalTiedInOverstock.toLocaleString()} idle capital</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Slow Moving</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{metrics.slowMovingCount}</span>
            <span className="text-xs text-slate-400">SKUs</span>
          </div>
          <span className="text-[11px] text-amber-600 mt-1 block">Velocity &lt; 0.4 units/day</span>
        </div>
      </div>

      {/* Middle Section: Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Inventory Health Gauge */}
        <div className="lg:col-span-1">
          <InventoryHealthGauge metrics={metrics} />
        </div>

        {/* 2. Stock Risk Matrix */}
        <div className="lg:col-span-2">
          <StockRiskMatrix
            analyses={filteredAnalyses}
            onQuickReorder={onReorder}
          />
        </div>
      </div>

      {/* 3. Distribution Donut & Priority Reorder List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <InventoryDistributionDonut
            metrics={metrics}
            analyses={filteredAnalyses}
          />
        </div>

        <div>
          <PriorityReorderList
            analyses={filteredAnalyses}
            onReorder={onReorder}
            onViewProduct={onViewProduct}
          />
        </div>
      </div>
    </div>
  );
};
