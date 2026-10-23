import React from 'react';
import { Product, InventoryBatch, ActivityLog } from '../../types';
import { Bell, AlertTriangle, Clock, Activity, X } from 'lucide-react';
import { NavItem } from '../layout/Sidebar';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  batches: InventoryBatch[];
  activityLogs: ActivityLog[];
  onNavigate: (tab: NavItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  products,
  batches,
  activityLogs,
  onNavigate
}) => {
  if (!isOpen) return null;

  const lowStockItems = products.filter(p => p.stock <= p.minStock);
  const nearExpiryBatches = batches.filter(b => b.status === 'expiring_soon');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Store Alerts & Live Activity</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Low Stock Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock Thresholds ({lowStockItems.length})</span>
              </span>
              <button
                onClick={() => {
                  onNavigate('reorder');
                  onClose();
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Open Reorder Planner &rarr;
              </button>
            </div>

            <div className="space-y-1.5">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 bg-slate-50 rounded-lg">All items well stocked.</p>
              ) : (
                lowStockItems.map(p => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[11px] text-rose-700">
                        Available: <span className="font-bold font-mono">{p.stock}</span> / Min: {p.minStock} {p.unit}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold rounded text-[10px]">
                      {p.stock === 0 ? 'STOCKOUT' : 'LOW'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Near Expiry Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Near Expiry Batches ({nearExpiryBatches.length})</span>
            </span>

            <div className="space-y-1.5">
              {nearExpiryBatches.length === 0 ? (
                <p className="text-xs text-slate-400 p-2 bg-slate-50 rounded-lg">No near-expiry batches.</p>
              ) : (
                nearExpiryBatches.map(b => {
                  const prod = products.find(p => p.id === b.productId);
                  return (
                    <div
                      key={b.id}
                      className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{prod?.name || 'Batch Item'}</p>
                        <p className="text-[11px] text-amber-800 font-mono">
                          Batch: {b.batchNo} · Qty: {b.quantity} · Expires: {b.expiryDate}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold rounded text-[10px]">
                        EXPIRING SOON
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Log Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Recent Store Activity Log</span>
            </span>

            <div className="space-y-1 max-h-40 overflow-y-auto">
              {activityLogs.slice(0, 8).map(log => (
                <div key={log.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-slate-800">{log.description}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by {log.user}
                    </p>
                  </div>
                  {log.amount !== undefined && (
                    <span className="font-mono font-bold text-slate-900">
                      ₹{log.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
