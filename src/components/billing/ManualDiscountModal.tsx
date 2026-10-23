import React, { useState, useEffect } from 'react';
import { Percent, X, Check, DollarSign } from 'lucide-react';

interface ManualDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDiscountPercent: number;
  subtotal: number;
  currencySymbol: string;
  onApplyDiscount: (percent: number) => void;
}

export const ManualDiscountModal: React.FC<ManualDiscountModalProps> = ({
  isOpen,
  onClose,
  currentDiscountPercent,
  subtotal,
  currencySymbol,
  onApplyDiscount
}) => {
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [percentVal, setPercentVal] = useState<string>(currentDiscountPercent.toString());
  const [flatAmountVal, setFlatAmountVal] = useState<string>(
    subtotal > 0 ? ((subtotal * currentDiscountPercent) / 100).toFixed(2) : '0'
  );

  useEffect(() => {
    if (isOpen) {
      setPercentVal(currentDiscountPercent.toString());
      setFlatAmountVal(
        subtotal > 0 ? ((subtotal * currentDiscountPercent) / 100).toFixed(2) : '0'
      );
    }
  }, [isOpen, currentDiscountPercent, subtotal]);

  if (!isOpen) return null;

  // Presets
  const presets = [0, 2.5, 5, 7.5, 10, 15, 20, 25];

  const parsedPercent = parseFloat(percentVal) || 0;
  const parsedFlat = parseFloat(flatAmountVal) || 0;

  let calculatedDiscount = 0;
  let finalTotal = subtotal;

  if (discountType === 'percent') {
    calculatedDiscount = Number(((subtotal * parsedPercent) / 100).toFixed(2));
    finalTotal = Math.max(0, subtotal - calculatedDiscount);
  } else {
    calculatedDiscount = Math.min(subtotal, parsedFlat);
    finalTotal = Math.max(0, subtotal - calculatedDiscount);
  }

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (discountType === 'percent') {
      const valid = Math.max(0, Math.min(100, parsedPercent));
      onApplyDiscount(valid);
    } else {
      if (subtotal <= 0) {
        onApplyDiscount(0);
      } else {
        const derivedPct = Number(((parsedFlat / subtotal) * 100).toFixed(2));
        const valid = Math.max(0, Math.min(100, derivedPct));
        onApplyDiscount(valid);
      }
    }
    onClose();
  };

  const handleSelectPreset = (p: number) => {
    setDiscountType('percent');
    setPercentVal(p.toString());
    setFlatAmountVal(((subtotal * p) / 100).toFixed(2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Adjust Manual Discount</h3>
              <p className="text-xs text-slate-500">Apply custom percentage or flat bill discount</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-4 space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setDiscountType('percent')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                discountType === 'percent'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('flat')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                discountType === 'flat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flat Amount ({currencySymbol})
            </button>
          </div>

          {/* Preset percentage chips */}
          {discountType === 'percent' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Discount Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      parsedPercent === p
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {discountType === 'percent' ? 'Enter Discount Percentage' : `Enter Flat Discount Amount (${currencySymbol})`}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono">
                {discountType === 'percent' ? '%' : currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={discountType === 'percent' ? 100 : subtotal}
                value={discountType === 'percent' ? percentVal : flatAmountVal}
                onChange={e => {
                  if (discountType === 'percent') {
                    setPercentVal(e.target.value);
                  } else {
                    setFlatAmountVal(e.target.value);
                  }
                }}
                className="w-full pl-8 pr-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* Real-time Calculation Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Cart Subtotal:</span>
              <span className="font-mono">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Discount Deduction:</span>
              <span className="font-mono">-{currencySymbol}{calculatedDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-1.5 border-t border-slate-200">
              <span>Adjusted Net Total:</span>
              <span className="font-mono">{currencySymbol}{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onApplyDiscount(0);
                onClose();
              }}
              className="py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
            >
              Reset to 0%
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Discount</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
