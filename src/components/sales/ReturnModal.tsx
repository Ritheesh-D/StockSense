import React, { useState } from 'react';
import { Invoice, PaymentMethod, StoreSettings } from '../../types';
import { ReturnsService } from '../../services/returnsService';
import { StorageService } from '../../services/storageService';
import { RotateCcw, AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: StoreSettings;
  onReturnSuccess: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  onReturnSuccess
}) => {
  const [returnItems, setReturnItems] = useState<{
    productId: string;
    quantity: number;
    condition: 'sellable' | 'damaged';
  }[]>([]);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [reason, setReason] = useState('Customer dissatisfaction / exchange');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize return quantities when opened
  React.useEffect(() => {
    if (invoice && isOpen) {
      setReturnItems(
        invoice.items.map(item => ({
          productId: item.productId,
          quantity: 0,
          condition: 'sellable'
        }))
      );
      setRefundMethod(invoice.payment.method || 'cash');
      setReason('Defective packaging or customer exchange');
      setErrorMsg(null);
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleQuantityChange = (productId: string, val: number, maxReturnable: number) => {
    const valid = Math.max(0, Math.min(val, maxReturnable));
    setReturnItems(prev =>
      prev.map(i => (i.productId === productId ? { ...i, quantity: valid } : i))
    );
  };

  const handleConditionChange = (productId: string, condition: 'sellable' | 'damaged') => {
    setReturnItems(prev =>
      prev.map(i => (i.productId === productId ? { ...i, condition } : i))
    );
  };

  // Calculate estimated refund
  let totalEstimatedRefund = 0;
  invoice.items.forEach(lineItem => {
    const itemReturn = returnItems.find(r => r.productId === lineItem.productId);
    if (itemReturn && itemReturn.quantity > 0) {
      const unitRate = lineItem.lineTotal / lineItem.quantity;
      totalEstimatedRefund += unitRate * itemReturn.quantity;
    }
  });

  const totalUnitsToReturn = returnItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (totalUnitsToReturn <= 0) {
      setErrorMsg('Please select at least 1 item quantity to return.');
      return;
    }

    const itemsToProcess = returnItems.filter(i => i.quantity > 0);

    const result = await ReturnsService.processReturn({
      invoiceId: invoice.id,
      itemsToReturn: itemsToProcess,
      refundMethod,
      reason,
      cashierName: settings.cashierName
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Failed to process return.');
      return;
    }

    onReturnSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Process Return / Refund</h3>
              <p className="text-xs text-slate-500 font-mono">Invoice: {invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitReturn} className="p-4 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Refund policy notice */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900">
            <p className="font-bold">Return & Restocking Rules:</p>
            <p className="mt-0.5 text-amber-800">
              Items marked <span className="font-semibold">Sellable</span> will be returned to inventory stock. Items marked <span className="font-semibold">Damaged</span> are written off without restocking.
            </p>
          </div>

          {/* Items selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Items & Quantities to Return
            </label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
              {invoice.items.map(item => {
                const alreadyReturned = item.returnedQuantity || 0;
                const maxReturnable = item.quantity - alreadyReturned;
                const currentReturn = returnItems.find(r => r.productId === item.productId);
                const currentQty = currentReturn?.quantity || 0;

                return (
                  <div key={item.productId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Sold: {item.quantity} · Already returned: {alreadyReturned} · Rate: {settings.currencySymbol}{item.unitPrice.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quantity input */}
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] text-slate-500">Qty:</label>
                        <input
                          type="number"
                          min="0"
                          max={maxReturnable}
                          value={currentQty}
                          disabled={maxReturnable <= 0}
                          onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 0, maxReturnable)}
                          className="w-14 px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold text-center focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">/ {maxReturnable}</span>
                      </div>

                      {/* Condition selector */}
                      {currentQty > 0 && (
                        <select
                          value={currentReturn?.condition || 'sellable'}
                          onChange={e => handleConditionChange(item.productId, e.target.value as 'sellable' | 'damaged')}
                          className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium focus:outline-none focus:border-amber-500"
                        >
                          <option value="sellable">Sellable (Restock)</option>
                          <option value="damaged">Damaged (Write off)</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Refund Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Refund Payment Method</label>
              <select
                value={refundMethod}
                onChange={e => setRefundMethod(e.target.value as PaymentMethod)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="cash">Cash Refund</option>
                <option value="upi">UPI Reversal</option>
                <option value="card">Card Reversal</option>
                <option value="other">Store Credit / Note</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Return</label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Expired seal, customer duplicate"
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Total Refund Banner */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Refund Payable</span>
              <p className="text-xl font-bold font-mono text-amber-400">
                {settings.currencySymbol}{totalEstimatedRefund.toFixed(2)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-300">
              <span>{totalUnitsToReturn} units being returned</span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalUnitsToReturn <= 0}
              className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm Refund</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
