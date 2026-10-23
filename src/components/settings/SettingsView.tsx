import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { DataMigrationCard } from './DataMigrationCard';
import { Store, Printer, CreditCard, RotateCcw, Check, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onRefreshData
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleChange = (field: keyof StoreSettings, val: unknown) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    onRefreshData();
  };

  const handleResetData = () => {
    StorageService.resetToDemoData();
    setResetConfirmOpen(false);
    onRefreshData();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System & Billing Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure store profile, thermal receipt formatting, tax regulations, and POS behavior.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      {/* Supabase Persistence & Data Migration Wizard */}
      <DataMigrationCard onRefreshData={onRefreshData} />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Section */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Store Information & Contact</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Business Name *</label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Subtitle</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Store Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Counter Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Tax Settings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Invoice Numbering & Tax Configuration</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={e => handleChange('invoicePrefix', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Next Sequence #</label>
              <input
                type="number"
                min="1"
                value={formData.nextInvoiceSequence}
                onChange={e => handleChange('nextInvoiceSequence', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={e => handleChange('currencySymbol', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Tax toggle */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Enable Sales Tax / GST</span>
                <span className="text-[11px] text-slate-500">
                  Calculate and print tax breakdown on receipts
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={e => handleChange('taxEnabled', e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </div>

            {formData.taxEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Label</label>
                  <input
                    type="text"
                    value={formData.taxLabel}
                    onChange={e => handleChange('taxLabel', e.target.value)}
                    placeholder="GST / VAT"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.defaultTaxPercent}
                    onChange={e => handleChange('defaultTaxPercent', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN / Tax ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.taxRegistrationNumber}
                    onChange={e => handleChange('taxRegistrationNumber', e.target.value)}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Printer & POS Hardware Setup */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Printer className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Receipt Printing & Cashier Options</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Receipt Format</label>
              <select
                value={formData.receiptSize}
                onChange={e => handleChange('receiptSize', e.target.value as '58mm' | '80mm' | 'a4')}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="80mm">80mm Thermal Receipt (Standard)</option>
                <option value="58mm">58mm Thermal Receipt (Compact)</option>
                <option value="a4">Standard A4 Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Active Cashier / Operator</label>
              <input
                type="text"
                value={formData.cashierName}
                onChange={e => handleChange('cashierName', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Payment Tender</label>
              <select
                value={formData.defaultPaymentMethod}
                onChange={e => handleChange('defaultPaymentMethod', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="cash">Cash Tender</option>
                <option value="upi">UPI Dynamic QR</option>
                <option value="card">Card Reader</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
            <input
              type="text"
              value={formData.footerMessage}
              onChange={e => handleChange('footerMessage', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            Save All Settings
          </button>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 max-w-sm w-full animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Restore Factory Demo Data?</h3>
            <p className="text-xs text-slate-600 mb-4">
              This will restore all default StockSense FMCG products, stock quantities, suppliers, and sample invoices to the clean starting state.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Yes, Restore Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
