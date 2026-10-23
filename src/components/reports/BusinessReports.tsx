import React, { useState } from 'react';
import { Product, Invoice, ReturnRecord, StoreSettings } from '../../types';
import { BarChart3, TrendingUp, DollarSign, PieChart, CreditCard, Clock, Layers } from 'lucide-react';

interface BusinessReportsProps {
  products: Product[];
  invoices: Invoice[];
  returns: ReturnRecord[];
  settings: StoreSettings;
}

export const BusinessReports: React.FC<BusinessReportsProps> = ({
  products,
  invoices,
  returns,
  settings
}) => {
  const [period, setPeriod] = useState<'7' | '30' | 'all'>('30');

  // Filter invoices by selected period
  const now = new Date();
  const filterDate = new Date();
  if (period === '7') filterDate.setDate(now.getDate() - 7);
  else if (period === '30') filterDate.setDate(now.getDate() - 30);
  else filterDate.setFullYear(2020);

  const validInvoices = invoices.filter(inv => {
    if (inv.status === 'cancelled') return false;
    const invDate = new Date(inv.createdAt);
    return invDate >= filterDate;
  });

  // Financial aggregates
  let totalGrossSales = 0;
  let totalCostOfGoodsSold = 0;

  validInvoices.forEach(inv => {
    totalGrossSales += inv.grandTotal;
    inv.items.forEach(item => {
      totalCostOfGoodsSold += item.purchasePrice * item.quantity;
    });
  });

  // Deduct refunds in this period
  const totalRefundAmount = returns
    .filter(r => new Date(r.timestamp) >= filterDate)
    .reduce((sum, r) => sum + r.totalRefund, 0);

  const netRevenue = Math.max(0, totalGrossSales - totalRefundAmount);
  const estimatedProfit = Math.max(0, netRevenue - totalCostOfGoodsSold);
  const profitMargin = netRevenue > 0 ? (estimatedProfit / netRevenue) * 100 : 0;
  const avgBillValue = validInvoices.length > 0 ? netRevenue / validInvoices.length : 0;

  // Payment Breakdown
  const paymentMethodStats = {
    cash: { count: 0, amount: 0 },
    upi: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    other: { count: 0, amount: 0 }
  };

  validInvoices.forEach(inv => {
    const m = inv.payment.method || 'cash';
    paymentMethodStats[m].count += 1;
    paymentMethodStats[m].amount += inv.grandTotal;
  });

  // Category Breakdown
  const categoryRevenue: Record<string, number> = {};
  validInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const cat = item.category || 'Other';
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.lineTotal;
    });
  });

  const categoryEntries = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1]);
  const categoryTotal = categoryEntries.reduce((sum, [, amt]) => sum + amt, 0) || 1;

  // Top 5 Products by Profit
  const productProfitMap: Record<string, { name: string; revenue: number; profit: number }> = {};
  validInvoices.forEach(inv => {
    inv.items.forEach(item => {
      if (!productProfitMap[item.productId]) {
        productProfitMap[item.productId] = { name: item.name, revenue: 0, profit: 0 };
      }
      productProfitMap[item.productId].revenue += item.lineTotal;
      productProfitMap[item.productId].profit += (item.lineTotal - item.purchasePrice * item.quantity);
    });
  });

  const topPerformance = Object.values(productProfitMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxPerformanceVal = Math.max(...topPerformance.map(p => p.revenue), 100);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner & Period Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Business Analytics & Performance</h2>
          <p className="text-xs text-slate-500 mt-1">
            Realized billing revenue, gross margins, tender distributions, and category velocity.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setPeriod('7')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              period === '7' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              period === '30' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              period === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {settings.currencySymbol}{netRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {validInvoices.length} completed customer sales
          </p>
        </div>

        {/* Total Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Cost of Goods (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {settings.currencySymbol}{totalCostOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Based on supplier purchase prices</p>
        </div>

        {/* Estimated Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Estimated Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
            {settings.currencySymbol}{estimatedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Net profit after refunds & discounts</p>
        </div>

        {/* Profit Margin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Profit Margin</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {profitMargin.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Avg. Bill Value: {settings.currencySymbol}{avgBillValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Two Column Grid: Product Performance vs Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Performance (Sales Revenue vs Profit) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Product Performance</h3>
              <p className="text-xs text-slate-500">Sales revenue generated vs gross profit margin</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm" />
                <span className="text-slate-600">Profit</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {topPerformance.map(prod => {
              const revPercent = Math.min(100, Math.round((prod.revenue / maxPerformanceVal) * 100));
              const profitPercent = Math.min(100, Math.round((prod.profit / maxPerformanceVal) * 100));

              return (
                <div key={prod.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-900 truncate max-w-[200px]">{prod.name}</span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-blue-700">Rev: {settings.currencySymbol}{prod.revenue.toFixed(0)}</span>
                      <span className="text-emerald-700">Profit: {settings.currencySymbol}{prod.profit.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${revPercent}%` }} className="bg-blue-600 h-full rounded-full" />
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${profitPercent}%` }} className="bg-emerald-500 h-full rounded-full" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Categories Share */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Sales by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Revenue contribution across store sections</p>

            <div className="space-y-3">
              {categoryEntries.slice(0, 6).map(([cat, amount]) => {
                const pct = Math.round((amount / categoryTotal) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat}</span>
                      <span className="font-mono font-bold text-slate-900">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="bg-emerald-600 h-full rounded-full" />
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {settings.currencySymbol}{amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modes Strip */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-1">Counter Tender Distribution</h3>
        <p className="text-xs text-slate-500 mb-4">Breakdown by cash, UPI, and card settlements</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cash Payments</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {settings.currencySymbol}{paymentMethodStats.cash.amount.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{paymentMethodStats.cash.count} transactions</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">UPI Payments</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-1">
              {settings.currencySymbol}{paymentMethodStats.upi.amount.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{paymentMethodStats.upi.count} transactions</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Card Payments</span>
            <p className="text-xl font-bold font-mono text-blue-700 mt-1">
              {settings.currencySymbol}{paymentMethodStats.card.amount.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{paymentMethodStats.card.count} transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};
