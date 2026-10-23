import React, { useState, useEffect } from 'react';
import { PaymentMethod, CartItem, Customer, StoreSettings, Invoice } from '../../types';
import { BillingService } from '../../services/billingService';
import { StorageService } from '../../services/storageService';
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  customer: Customer | null;
  settings: StoreSettings;
  onSaleComplete: (invoice: Invoice) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  billDiscountPercent,
  billDiscountAmount,
  taxPercent,
  taxAmount,
  grandTotal,
  customer,
  settings,
  onSaleComplete
}) => {
  const [method, setMethod] = useState<PaymentMethod>(settings.defaultPaymentMethod || 'cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMethod(settings.defaultPaymentMethod || 'cash');
      setCashTendered(grandTotal > 0 ? grandTotal.toFixed(2) : '0');
      setTransactionRef('');
      setNotes('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, grandTotal, settings.defaultPaymentMethod]);

  if (!isOpen) return null;

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);
  const isCashShort = method === 'cash' && tenderedNum < grandTotal;

  // Quick cash note buttons
  const cashQuickNotes = [
    { label: 'Exact', amount: grandTotal },
    { label: '₹50', amount: 50 },
    { label: '₹100', amount: 100 },
    { label: '₹200', amount: 200 },
    { label: '₹500', amount: 500 },
    { label: '₹2000', amount: 2000 },
  ];

  const handleConfirmSale = async () => {
    setErrorMsg(null);

    if (method === 'cash' && isCashShort) {
      setErrorMsg(`Cash received is less than total payable (${settings.currencySymbol}${grandTotal.toFixed(2)}).`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await BillingService.checkoutSale({
        cartItems,
        subtotal,
        billDiscountPercent,
        billDiscountAmount,
        taxPercent,
        taxAmount,
        grandTotal,
        payment: {
          method,
          amountPaid: method === 'cash' ? tenderedNum : grandTotal,
          changeGiven: method === 'cash' ? changeDue : 0,
          transactionRef: transactionRef.trim() || undefined
        },
        customer,
        notes: notes.trim() || undefined
      });

      if (!result.success || !result.invoice) {
        setErrorMsg(result.error || 'Transaction failed. Please check stock and try again.');
        setIsSubmitting(false);
        return;
      }

      // Success
      setIsSubmitting(false);
      onSaleComplete(result.invoice);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred during checkout.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Checkout & Payment</h3>
            <p className="text-xs text-slate-500">
              Customer: <span className="font-semibold text-slate-700">{customer?.name || 'Walk-in Customer'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Due Big Banner */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-800">Total Payable</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-mono tracking-tight">
                {settings.currencySymbol}{grandTotal.toFixed(2)}
              </p>
            </div>
            <div className="text-right text-xs text-emerald-800 space-y-0.5">
              <p>Items: {cartItems.reduce((acc, i) => acc + i.quantity, 0)} units</p>
              {billDiscountAmount > 0 && <p className="text-emerald-700">Disc: -{settings.currencySymbol}{billDiscountAmount.toFixed(2)}</p>}
              {taxAmount > 0 && <p>Tax: +{settings.currencySymbol}{taxAmount.toFixed(2)}</p>}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`py-3 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`py-3 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                  method === 'upi'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`py-3 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                  method === 'card'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('other')}
                className={`py-3 px-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                  method === 'other'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Layers className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Other</span>
              </button>
            </div>
          </div>

          {/* Conditional Method Inputs */}
          {method === 'cash' && (
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Amount Tendered ({settings.currencySymbol})</label>
                <span className="text-xs text-slate-500">Fast Tender Selection:</span>
              </div>

              {/* Quick note buttons */}
              <div className="flex flex-wrap gap-1.5">
                {cashQuickNotes.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCashTendered(item.amount.toFixed(2))}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-md hover:bg-emerald-50 hover:border-emerald-400 text-slate-800 font-mono transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Cash input & Change calculation */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Cash Received</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      className={`w-full pl-8 pr-3 py-2 text-base font-bold font-mono rounded-lg border focus:outline-none ${
                        isCashShort
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30 text-rose-900'
                          : 'border-slate-300 focus:border-emerald-500 bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Change Return</span>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg">
                    <p className={`text-base font-bold font-mono ${changeDue > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {settings.currencySymbol}{changeDue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {isCashShort && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Remaining due: {settings.currencySymbol}{(grandTotal - tenderedNum).toFixed(2)}
                </p>
              )}
            </div>
          )}

          {method === 'upi' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-3">
              <div className="inline-block p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
                {/* Simulated dynamic UPI QR code */}
                <div className="w-36 h-36 mx-auto bg-slate-900 p-2 flex flex-col items-center justify-center text-white rounded">
                  <QrCode className="w-24 h-24 text-emerald-400" />
                  <span className="text-[10px] font-mono tracking-wider text-emerald-300 mt-1">SCAN TO PAY</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">UPI ID: stocksense@okicici</p>
                <p className="text-[11px] text-slate-500">Ask customer to scan with GPay, PhonePe, Paytm, or BHIM</p>
              </div>

              <div className="text-left pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UPI UTR / Reference No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 429381028371"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-700 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Swipe or tap on shop EDC card terminal</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Reference / Last 4 digits (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. VISA-4819 or TXN-99812"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
            </div>
          )}

          {method === 'other' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Payment Reference / Note</label>
              <input
                type="text"
                placeholder="e.g. Store credit, Sodexo meal coupon, Cheque #1029"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>
          )}

          {/* Bill Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cashier Remarks (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Regular discount applied, customer requested bag"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || isCashShort}
            onClick={handleConfirmSale}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Sale ({settings.currencySymbol}{grandTotal.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
