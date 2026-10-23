import React, { useState } from 'react';
import { Product, Invoice, StoreSettings } from '../../types';
import { AnalyticsService } from '../../services/analyticsService';
import { TrendingUp, TrendingDown, Minus, Calendar, Sparkles } from 'lucide-react';

interface DemandForecastingProps {
  products: Product[];
  invoices: Invoice[];
  settings: StoreSettings;
}

export const DemandForecasting: React.FC<DemandForecastingProps> = ({
  products,
  invoices,
  settings
}) => {
  const [horizon, setHorizon] = useState<'7' | '14' | '30'>('30');
  const horizonDays = parseInt(horizon);

  // Compute forecasts for each product
  const forecasts = products.map(prod => {
    const dailyVelocity = AnalyticsService.getProductDailySales(prod.id, invoices);
    const predictedDemand = Math.round(dailyVelocity * horizonDays);
    const stockCoverageDays = dailyVelocity > 0 ? Math.floor(prod.stock / dailyVelocity) : 99;

    // Trend heuristic based on stock vs forecast
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (dailyVelocity >= 3.0) trend = 'up';
    else if (dailyVelocity < 1.5) trend = 'down';

    return {
      product: prod,
      dailyVelocity,
      predictedDemand,
      stockCoverageDays,
      trend,
      deficit: Math.max(0, predictedDemand - prod.stock)
    };
  }).sort((a, b) => b.predictedDemand - a.predictedDemand);

  // Top 5 products for chart projection
  const topForecasts = forecasts.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner & Horizon Switcher */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900">Demand Forecasting Engine</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calculated from completed POS sales transactions, historical seasonal velocity, and current stock run-rates.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <button
            onClick={() => setHorizon('7')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              horizon === '7' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Next 7 Days
          </button>
          <button
            onClick={() => setHorizon('14')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              horizon === '14' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Next 14 Days
          </button>
          <button
            onClick={() => setHorizon('30')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              horizon === '30' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Next 30 Days
          </button>
        </div>
      </div>

      {/* Visual Chart Projection */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Predicted Demand Curve (Next {horizonDays} Days)</h3>
            <p className="text-xs text-slate-500">Projected unit volume requirements for high velocity inventory</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {topForecasts.map((f, i) => {
              const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-indigo-600', 'bg-rose-600'];
              return (
                <div key={f.product.id} className="hidden md:flex items-center gap-1.5 text-slate-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                  <span className="truncate max-w-[90px]">{f.product.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forecast Visual Bars */}
        <div className="space-y-4 pt-2">
          {topForecasts.map((f, i) => {
            const maxVal = Math.max(...topForecasts.map(t => t.predictedDemand), 50);
            const demandWidth = Math.min(100, Math.round((f.predictedDemand / maxVal) * 100));
            const stockWidth = Math.min(100, Math.round((f.product.stock / maxVal) * 100));
            const isDeficit = f.deficit > 0;

            return (
              <div key={f.product.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{f.product.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({f.dailyVelocity} units/day)</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-500">Stock: {f.product.stock}</span>
                    <span className="font-bold text-slate-900">Forecast: {f.predictedDemand} units</span>
                    {isDeficit && (
                      <span className="text-rose-600 font-semibold">Shortfall: -{f.deficit}</span>
                    )}
                  </div>
                </div>

                {/* Dual bar: Stock vs Forecast */}
                <div className="w-full bg-slate-100 h-3 rounded-full relative overflow-hidden flex">
                  <div
                    style={{ width: `${demandWidth}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isDeficit ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Summary Table matching mockup */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Forecast Summary & Run-Rates</h3>
          <span className="text-xs text-slate-500">{forecasts.length} catalog items tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/40">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Avg. Daily Sales</th>
                <th className="py-3 px-4 text-center">Coverage (Days)</th>
                <th className="py-3 px-4 text-center">Predicted Demand ({horizonDays}d)</th>
                <th className="py-3 px-4 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {forecasts.map(f => (
                <tr key={f.product.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{f.product.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{f.product.sku}</p>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                    {f.product.stock} {f.product.unit}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                    {f.dailyVelocity} / day
                  </td>
                  <td className="py-3 px-4 text-center font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        f.stockCoverageDays <= 7
                          ? 'bg-rose-100 text-rose-800'
                          : f.stockCoverageDays <= 15
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {f.stockCoverageDays} days
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                    {f.predictedDemand} units
                  </td>
                  <td className="py-3 px-4 text-center">
                    {f.trend === 'up' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Surging</span>
                      </span>
                    )}
                    {f.trend === 'down' && (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Slow</span>
                      </span>
                    )}
                    {f.trend === 'stable' && (
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium text-xs">
                        <Minus className="w-3.5 h-3.5" />
                        <span>Steady</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
