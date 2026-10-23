import React, { useState } from 'react';
import { Product, Invoice, Supplier, PurchaseOrder, StoreSettings } from '../../types';
import { AnalyticsService, ProductReorderRecommendation } from '../../services/analyticsService';
import { StorageService } from '../../services/storageService';
import { RefreshCw, AlertTriangle, CheckCircle2, ShoppingCart, Truck, Calendar } from 'lucide-react';
import { NavItem } from '../layout/Sidebar';

interface SmartReorderPlannerProps {
  products: Product[];
  invoices: Invoice[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  settings: StoreSettings;
  onNavigate: (tab: NavItem) => void;
  onRefreshData: () => void;
}

export const SmartReorderPlanner: React.FC<SmartReorderPlannerProps> = ({
  products,
  invoices,
  suppliers,
  purchaseOrders,
  settings,
  onNavigate,
  onRefreshData
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [createdPOMessage, setCreatedPOMessage] = useState<string | null>(null);

  const recommendations = AnalyticsService.getReorderRecommendations(
    products,
    invoices,
    suppliers,
    purchaseOrders
  );

  const criticalCount = recommendations.filter(r => r.priority === 'CRITICAL').length;
  const highCount = recommendations.filter(r => r.priority === 'HIGH').length;

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      onRefreshData();
      setIsRecalculating(false);
    }, 400);
  };

  const handleCreateQuickPO = (rec: ProductReorderRecommendation) => {
    const product = products.find(p => p.id === rec.productId);
    if (!product) return;

    const supplier = suppliers.find(s => s.id === product.supplierId) || suppliers[0];
    const orderNumber = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
    const cost = product.purchasePrice * rec.recommendedOrder;

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + supplier.leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      items: [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: rec.recommendedOrder,
          unitCost: product.purchasePrice,
          totalCost: cost
        }
      ],
      totalAmount: cost,
      notes: `Auto-generated reorder planner PO for ${product.name}`
    };

    const currentPOs = StorageService.getPurchaseOrders();
    currentPOs.unshift(newPO);
    StorageService.savePurchaseOrders(currentPOs);

    StorageService.logActivity({
      type: 'stock_in',
      description: `Generated Purchase Order ${orderNumber} for ${product.name} (${rec.recommendedOrder} units)`,
      amount: cost,
      user: 'Admin'
    });

    setCreatedPOMessage(`Created Purchase Order ${orderNumber} for ${product.name}. Check Purchase Orders tab.`);
    setTimeout(() => setCreatedPOMessage(null), 4000);
    onRefreshData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header & Recalculate Button */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Smart Reorder Planner</h2>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic stockout prevention based on real-time POS consumption, vendor lead times, and safety buffers.
          </p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
        </button>
      </div>

      {createdPOMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{createdPOMessage}</span>
          </div>
          <button
            onClick={() => onNavigate('purchase_orders')}
            className="text-xs font-bold underline underline-offset-2 hover:text-emerald-950"
          >
            Go to POs &rarr;
          </button>
        </div>
      )}

      {/* Stockout Guidance Banner matching mockup */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="text-xs text-blue-900">
          <p className="font-bold">Stock-Out Prediction helps you plan ahead and avoid lost sales.</p>
          <p className="mt-0.5 text-blue-800">
            Currently <span className="font-bold">{criticalCount + highCount} products</span> require attention. We recommend placing replenishment orders for any SKU with less than 15 days of stock coverage.
          </p>
        </div>
      </div>

      {/* Reorder Recommendations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Suggested Reorder Quantities</h3>
          <span className="text-xs text-slate-500 font-mono">
            {criticalCount} Critical · {highCount} High Priority
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/40">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Avg. Daily Sales</th>
                <th className="py-3 px-4 text-center">Days Left</th>
                <th className="py-3 px-4">Stock-Out Date</th>
                <th className="py-3 px-4 text-center">Suggested PO</th>
                <th className="py-3 px-4">Reason & Lead Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendations.map(rec => {
                const isCritical = rec.priority === 'CRITICAL';
                const isHigh = rec.priority === 'HIGH';

                return (
                  <tr key={rec.productId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Product */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{rec.productName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{rec.sku}</p>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-800">
                      {rec.currentStock}
                    </td>

                    {/* Avg Daily Sales */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                      {rec.avgDailySales}
                    </td>

                    {/* Days Left */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-xs inline-block ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rec.daysOfCoverage} days
                      </span>
                    </td>

                    {/* Stock-Out Date */}
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap font-medium">
                      {rec.predictedStockoutDate}
                    </td>

                    {/* Suggested PO */}
                    <td className="py-3 px-4 text-center font-mono">
                      {rec.recommendedOrder > 0 ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md inline-block">
                          +{rec.recommendedOrder} units
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Adequate</span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      <p className="font-medium text-slate-800">{rec.reason}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supplier: {rec.supplierName} ({rec.supplierLeadTime}d lead)
                        {rec.pendingIncomingStock > 0 && ` · Incoming: ${rec.pendingIncomingStock} units`}
                      </p>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {rec.recommendedOrder > 0 ? (
                        <button
                          onClick={() => handleCreateQuickPO(rec)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          + Create PO
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Stocked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
