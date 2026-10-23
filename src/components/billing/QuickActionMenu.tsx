import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  UserPlus,
  Percent,
  Clock,
  Play,
  RotateCcw,
  Barcode,
  CreditCard,
  X,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface QuickActionMenuProps {
  onAddNewCustomer: () => void;
  onAdjustManualDiscount: () => void;
  onToggleHoldBill: () => void;
  onResumeHeldBill: () => void;
  onFocusBarcode: () => void;
  onClearBill: () => void;
  onQuickCheckout: () => void;
  hasCartItems: boolean;
  heldBillsCount: number;
  currentDiscountPercent: number;
}

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  onAddNewCustomer,
  onAdjustManualDiscount,
  onToggleHoldBill,
  onResumeHeldBill,
  onFocusBarcode,
  onClearBill,
  onQuickCheckout,
  hasCartItems,
  heldBillsCount,
  currentDiscountPercent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Global Keyboard Shortcut: Alt + Q toggles quick action menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-8 z-40">
      {/* Floating Action Menu Popover */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Counter Quick Actions</h4>
                <p className="text-[10px] text-slate-400 font-mono">Shortcut: Alt + Q</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              aria-label="Close Quick Actions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action List */}
          <div className="p-2 space-y-1 max-h-[75vh] overflow-y-auto">
            {/* 1. Add New Customer */}
            <button
              type="button"
              onClick={() => {
                onAddNewCustomer();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 group border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 leading-tight">Add New Customer</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">Register contact and associate with bill</p>
              </div>
            </button>

            {/* 2. Adjust Manual Discount */}
            <button
              type="button"
              onClick={() => {
                onAdjustManualDiscount();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 group border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Percent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Adjust Manual Discount</p>
                  {currentDiscountPercent > 0 && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {currentDiscountPercent}% active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">Set custom % or flat rupee reduction</p>
              </div>
            </button>

            {/* 3. Hold Current Bill */}
            <button
              type="button"
              disabled={!hasCartItems}
              onClick={() => {
                onToggleHoldBill();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-3 group border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 leading-tight">Hold Current Bill</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">Save cart as draft and clear counter for next customer</p>
              </div>
            </button>

            {/* 4. Resume Held Bill */}
            <button
              type="button"
              disabled={heldBillsCount === 0}
              onClick={() => {
                onResumeHeldBill();
                setIsOpen(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-3 group border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors relative">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Resume Held Bills</p>
                  {heldBillsCount > 0 && (
                    <span className="text-[10px] font-mono font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">
                      {heldBillsCount} held
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">Restore a held transaction back to cart</p>
              </div>
            </button>

            <div className="border-t border-slate-100 my-1"></div>

            {/* 5. Focus Barcode Scanner */}
            <button
              type="button"
              onClick={() => {
                onFocusBarcode();
                setIsOpen(false);
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Barcode className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">Focus Barcode Scanner</p>
              </div>
            </button>

            {/* 6. Quick Checkout */}
            {hasCartItems && (
              <button
                type="button"
                onClick={() => {
                  onQuickCheckout();
                  setIsOpen(false);
                }}
                className="w-full text-left p-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/70 transition-colors flex items-center gap-3 text-emerald-900 border border-emerald-200"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-950">Quick Checkout Modal</p>
                </div>
              </button>
            )}

            {/* 7. Clear Bill */}
            {hasCartItems && (
              <button
                type="button"
                onClick={() => {
                  onClearBill();
                  setIsOpen(false);
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-3 text-rose-700"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-rose-800">Clear Current Bill</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`group flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full shadow-xl transition-all duration-200 border cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-700 ring-2 ring-emerald-500/50'
            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700/80 hover:shadow-2xl'
        }`}
        title="Quick Actions (Alt + Q)"
        aria-expanded={isOpen}
      >
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-xs group-hover:scale-105 transition-transform">
          <Zap className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="text-xs font-bold tracking-tight pr-0.5">Quick Actions</span>
        {heldBillsCount > 0 && !isOpen && (
          <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center font-mono">
            {heldBillsCount}
          </span>
        )}
        <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
};
