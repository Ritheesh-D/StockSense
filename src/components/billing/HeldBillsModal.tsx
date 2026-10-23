import React from 'react';
import { HeldBill } from '../../types';
import { Clock, Play, Trash2, X, ShoppingBag } from 'lucide-react';

interface HeldBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldBills: HeldBill[];
  onResumeHeldBill: (heldBill: HeldBill) => void;
  onDeleteHeldBill: (id: string) => void;
  currencySymbol: string;
}

export const HeldBillsModal: React.FC<HeldBillsModalProps> = ({
  isOpen,
  onClose,
  heldBills,
  onResumeHeldBill,
  onDeleteHeldBill,
  currencySymbol
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-base">Held Counter Bills ({heldBills.length})</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
          {heldBills.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No bills on hold</p>
              <p className="text-xs text-slate-400 mt-1">
                You can hold any ongoing transaction when a customer steps away.
              </p>
            </div>
          ) : (
            heldBills.map(bill => {
              const totalItems = bill.cartItems.reduce((sum, item) => sum + item.quantity, 0);
              const estTotal = bill.cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
              const timeFormatted = new Date(bill.heldAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={bill.id}
                  className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-mono">
                        {timeFormatted}
                      </span>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {bill.customerName || 'Walk-in Customer'}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>{totalItems} units ({bill.cartItems.length} products)</span>
                      <span>·</span>
                      <span className="font-semibold text-emerald-700 font-mono">
                        {currencySymbol}{estTotal.toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onResumeHeldBill(bill)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                    <button
                      onClick={() => onDeleteHeldBill(bill.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Discard held bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
