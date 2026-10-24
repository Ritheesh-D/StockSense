// src/components/dashboard/OverviewDashboard.tsx
import React, { useState, useMemo } from 'react';
import { Product, Invoice, ReturnRecord, InventoryBatch, StoreSettings, Supplier, SmartRecommendation, ProductHealthAnalysis } from '../../types';
import { HealthIntelligenceService } from '../../services/healthIntelligenceService';
import { StorageService } from '../../services/storageService';
import { exportProductsToCsv, CsvImportSummary } from '../../utils/csvImportExport';
import { InventoryHealthGauge } from './InventoryHealthGauge';
import { StockRiskMatrix } from './StockRiskMatrix';
import { InventoryDistributionDonut } from './InventoryDistributionDonut';
import { PriorityReorderList } from './PriorityReorderList';
import { SmartRecommendationsPanel } from './SmartRecommendationsPanel';
import { RecentImportsCard } from './RecentImportsCard';
import { CsvImportModal } from '../inventory/CsvImportModal';
import {
  ShieldAlert,
  AlertTriangle,
  Upload,
  Download,
  Receipt,
  Plus,
  Sparkles,
  TrendingDown,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import { NavItem } from '../layout/Sidebar';

interface OverviewDashboardProps {
  products: Product[];
  invoices: Invoice[];
  returns?: ReturnRecord[];
  suppliers?: Supplier[];
  batches?: InventoryBatch[];
  settings: StoreSettings;
  onNavigate: (tab: NavItem) => void;
  onReorderProduct?: (analysis: ProductHealthAnalysis) => void;
  onImportProducts?: (newProducts: Partial<Product>[], summary: CsvImportSummary) => Promise<void>;
  onOpenAddProduct?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  products,
  invoices,
  returns = [],
  suppliers = [],
  settings,
  onNavigate,
  onReorderProduct,
  onImportProducts,
  onOpenAddProduct
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [recentImports, setRecentImports] = useState<CsvImportSummary[]>(() => StorageService.getRecentImports());

  // 1. Run Flagship Inventory Health Intelligence Engine
  const { metrics, analyses, recommendations } = useMemo(() => {
    return HealthIntelligenceService.calculateOverallMetrics(products, invoices, returns);
  }, [products, invoices, returns]);

  // Handle CSV Export
  const handleExportCsv = () => {
    exportProductsToCsv(products, suppliers);
  };

  // Handle Import Complete
  const handleImportComplete = async (newProducts: Partial<Product>[], summary: CsvImportSummary) => {
    StorageService.saveRecentImport(summary);
    setRecentImports(StorageService.getRecentImports());
    if (onImportProducts) {
      await onImportProducts(newProducts, summary);
    }
  };

  // Handle recommendation action
  const handleRecommendationAction = (rec: SmartRecommendation) => {
    if (rec.actionType === 'reorder' || rec.actionType === 'create_po') {
      if (rec.productId) {
        const item = analyses.find((a: ProductHealthAnalysis) => a.productId === rec.productId);
        if (item && onReorderProduct) {
          onReorderProduct(item);
          return;
        }
      }
      onNavigate('reorder');
    } else if (rec.actionType === 'discount' || rec.actionType === 'review') {
      onNavigate('inventory');
    } else {
      onNavigate('inventory');
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
      {/* ---------------------------------------- */}
      {/* TOP SECTION: HEALTH SCORE, RISK ALERTS, QUICK ACTIONS */}
      {/* ---------------------------------------- */}
      <section className="space-y-4">
        {/* Banner Card: Overall Health Score */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
          {/* Subtle decorative background blur */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Overall Health Score & Grade */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Flagship Intelligence
                </span>
                <span className="text-xs text-slate-400">• Live Health Index</span>
              </div>

              <div className="flex items-baseline gap-4 pt-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
                  {metrics.healthScore}
                  <span className="text-xl sm:text-2xl text-slate-400 font-normal">/100</span>
                </span>
                <span className="px-3 py-1 rounded-xl text-sm sm:text-base font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Grade {metrics.grade}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
                {metrics.healthScore >= 80
                  ? 'Excellent stock health. Optimal capital turnover with minimal stockout vulnerability.'
                  : metrics.healthScore >= 60
                  ? 'Moderate risk detected. Action recommended on overstocked and near-empty SKUs.'
                  : 'High inventory risk. Multiple critical stockouts & dead inventory require immediate action.'}
              </p>
            </div>

            {/* Right: Portfolio breakdown pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">Healthy</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white">{metrics.healthyPercent}%</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 block">Overstock</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white">{metrics.overstockPercent}%</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">Understock</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white">{metrics.understockPercent}%</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block">Dead Stock</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white">{metrics.deadStockPercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Alerts & Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Alerts (2 cols) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Critical Stockout Alert */}
            <div
              onClick={() => onNavigate('inventory')}
              className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-2xs hover:bg-rose-100/70 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    Critical Stockouts
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono">
                      {metrics.immediateStockoutCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    SKUs with under 3 days coverage or zero units
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-700 shrink-0" />
            </div>

            {/* Overstock Capital Tied Up Alert */}
            <div
              onClick={() => onNavigate('inventory')}
              className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/90 shadow-2xs hover:bg-blue-100/70 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    Overstock Capital Risk
                    <span className="text-[10px] font-mono text-blue-700 font-semibold">
                      ({metrics.overstockedCount} SKUs)
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    ₹{metrics.capitalTiedInOverstock.toLocaleString()} tied in excess buffer
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-700 shrink-0" />
            </div>
          </div>

          {/* Quick Actions Panel (1 col) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Import CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Open POS</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------- */}
      {/* MIDDLE SECTION: HEALTH GAUGE, RISK MATRIX, DISTRIBUTION DONUT */}
      {/* ---------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Analytics & Risk Visualizations
          </h2>
          <span className="text-xs text-slate-400">Demand Velocity vs Stock Position</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Inventory Health Gauge */}
          <div className="lg:col-span-1">
            <InventoryHealthGauge metrics={metrics} />
          </div>

          {/* 2. Stock Risk Matrix (takes 2 cols on wide screens) */}
          <div className="lg:col-span-2">
            <StockRiskMatrix
              analyses={analyses}
              onQuickReorder={(analysis) => {
                if (onReorderProduct) onReorderProduct(analysis);
              }}
            />
          </div>
        </div>

        {/* 3. Inventory Distribution Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-3">
            <InventoryDistributionDonut
              metrics={metrics}
              analyses={analyses}
              onSelectCategory={(cat) => {
                // Allows filtering
              }}
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------- */}
      {/* BOTTOM SECTION: PRIORITY REORDER LIST, RECENT IMPORTS, SMART RECOMMENDATIONS */}
      {/* ---------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Actionable Intelligence
          </h2>
          <span className="text-xs text-slate-400">Immediate operations & optimizations</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Priority Reorder List (2 cols) */}
          <div className="lg:col-span-2">
            <PriorityReorderList
              analyses={analyses}
              onReorder={(analysis) => {
                if (onReorderProduct) onReorderProduct(analysis);
              }}
              onViewProduct={(productId) => {
                onNavigate('inventory');
              }}
            />
          </div>

          {/* Recent Imports Card (1 col) */}
          <div className="lg:col-span-1">
            <RecentImportsCard
              recentImports={recentImports}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onExportCsv={handleExportCsv}
            />
          </div>
        </div>

        {/* Smart Recommendations Panel (Full Width) */}
        <div>
          <SmartRecommendationsPanel
            recommendations={recommendations}
            onTakeAction={handleRecommendationAction}
          />
        </div>
      </section>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingProducts={products}
        suppliers={suppliers}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};
