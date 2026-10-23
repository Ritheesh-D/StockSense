import React, { useState } from 'react';
import { PurchaseOrder, Supplier, Product, StoreSettings } from '../../types';
import { PurchaseOrderService } from '../../services/purchaseOrderService';
import { StorageService } from '../../services/storageService';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  PackageCheck,
  AlertCircle,
  X
} from 'lucide-react';

interface PurchaseOrdersProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  products: Product[];
  settings: StoreSettings;
  onRefreshData: () => void;
}

export const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({
  purchaseOrders,
  suppliers,
  products,
  settings,
  onRefreshData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 20 }
  ]);
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleReceiveOrder = async (orderId: string) => {
    const result = await PurchaseOrderService.receivePurchaseOrder({ orderId });
    if (result.success) {
      setFeedbackMsg({ text: result.message, type: 'success' });
      onRefreshData();
    } else {
      setFeedbackMsg({ text: result.error || result.message, type: 'error' });
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddItemRow = () => {
    setOrderItems(prev => [...prev, { productId: products[0]?.id || '', quantity: 10 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, productId: string) => {
    setOrderItems(prev => prev.map((item, i) => (i === idx ? { ...item, productId } : item)));
  };

  const handleQtyChange = (idx: number, quantity: number) => {
    setOrderItems(prev => prev.map((item, i) => (i === idx ? { ...item, quantity: Math.max(1, quantity) } : item)));
  };

  // Calculate order total
  const calculatedTotal = orderItems.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.productId);
    return sum + (p ? p.purchasePrice * item.quantity : 0);
  }, 0);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
    const orderNumber = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;

    const items = orderItems.map(item => {
      const p = products.find(prod => prod.id === item.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity: item.quantity,
        unitCost: p.purchasePrice,
        totalCost: p.purchasePrice * item.quantity
      };
    });

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: sup.id,
      supplierName: sup.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: new Date(Date.now() + sup.leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      items,
      totalAmount: calculatedTotal,
      notes: notes.trim() || undefined
    };

    const res = await PurchaseOrderService.createPurchaseOrder(newPO);
    if (!res.data) {
      setFeedbackMsg({ text: res.error || 'Failed to create purchase order', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    setIsModalOpen(false);
    setNotes('');
    setFeedbackMsg({ text: `Purchase Order ${orderNumber} created. It is now awaiting supplier delivery.`, type: 'success' });
    setTimeout(() => setFeedbackMsg(null), 4000);
    onRefreshData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Orders & Receiving</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track restock shipments from suppliers. Receiving an order immediately replenishes live sellable inventory.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-semibold">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Orders Table matching mockup */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Recent Purchase Orders</h3>
          <span className="text-xs text-slate-500 font-mono">{purchaseOrders.length} orders on file</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-semibold bg-slate-50/40">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchaseOrders.map(po => {
                const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Order ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {po.orderNumber}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {po.supplierName}
                    </td>

                    {/* Order Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {po.orderDate}
                    </td>

                    {/* Expected Date */}
                    <td className="py-3 px-4 text-slate-600">
                      {po.status === 'received' ? (
                        <span className="text-emerald-700 font-medium">Received on {po.receivedDate}</span>
                      ) : (
                        <span>Expected by {po.expectedDate}</span>
                      )}
                    </td>

                    {/* Items */}
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                        {totalUnits} units ({po.items.length} items)
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {settings.currencySymbol}{po.totalAmount.toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {po.status === 'received' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>Received</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Pending Delivery</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {po.status === 'pending' ? (
                        <button
                          onClick={() => handleReceiveOrder(po.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors ml-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Receive Stock</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Stocks Added</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">New Purchase Order</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-4 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.leadTimeDays} days lead time)
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Order Items & Restock Units
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {orderItems.map((item, idx) => {
                    const prod = products.find(p => p.id === item.productId);
                    const lineCost = prod ? prod.purchasePrice * item.quantity : 0;

                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <select
                          value={item.productId}
                          onChange={e => handleItemChange(idx, e.target.value)}
                          className="flex-1 text-xs border border-slate-200 rounded p-1.5 bg-white focus:outline-none"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({settings.currencySymbol}{p.purchasePrice.toFixed(2)} cost)
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1 shrink-0">
                          <label className="text-[11px] text-slate-500">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded font-mono font-bold text-center"
                          />
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-800 min-w-[70px] text-right shrink-0">
                          {settings.currencySymbol}{lineCost.toFixed(2)}
                        </span>

                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Purchase Order Cost:</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {settings.currencySymbol}{calculatedTotal.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent weekend delivery requested"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Generate Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
