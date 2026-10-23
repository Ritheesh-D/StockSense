// src/components/settings/DataMigrationCard.tsx
// Supabase Data Migration Wizard, LocalStorage Preview, CSV Import/Export, and Environment Status

import React, { useState, useEffect } from 'react';
import { Database, UploadCloud, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import { DemoMigrationService, MigrationPreview } from '../../services/demoMigrationService';
import { isSupabaseConfigured, testSupabaseConnection } from '../../services/supabaseClient';
import { CsvService } from '../../services/csvService';
import { StorageService } from '../../services/storageService';
import { AuthService } from '../../services/authService';

interface DataMigrationCardProps {
  onRefreshData: () => void;
}

export const DataMigrationCard: React.FC<DataMigrationCardProps> = ({ onRefreshData }) => {
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migratedCounts: Record<string, number>;
    errors: string[];
  } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // CSV Import State
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<any | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoadingPreview(true);
    const p = await DemoMigrationService.previewLocalData();
    setPreview(p);
    setLoadingPreview(false);
  };

  useEffect(() => {
    loadPreview();
  }, []);

  const handleRunMigration = async () => {
    setConfirmOpen(false);
    setMigrating(true);
    setMigrationResult(null);

    const res = await DemoMigrationService.executeMigration('merge');
    setMigrationResult(res);
    setMigrating(false);
    onRefreshData();
    loadPreview();
  };

  const handleExportProductsCsv = () => {
    const products = StorageService.getProducts();
    const csv = CsvService.exportProductsToCsv(products);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocksense-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSalesCsv = () => {
    const invoices = StorageService.getInvoices();
    const csv = CsvService.exportSalesToCsv(invoices);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stocksense-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      const existing = StorageService.getProducts();
      const validation = CsvService.validateProductCsv(text, existing);
      setCsvPreview(validation);
      setCsvResult(null);
    };
    reader.readAsText(file);
  };

  const handleCommitCsv = async () => {
    if (!csvPreview || csvPreview.validRows.length === 0) return;
    setCsvImporting(true);

    const { importedCount, errors } = await CsvService.importProducts(csvPreview.validRows);
    setCsvImporting(false);
    setCsvResult(`Successfully imported ${importedCount} products into catalog. (${errors.length} skipped)`);
    setCsvPreview(null);
    setCsvText('');
    onRefreshData();
  };

  const isConfigured = isSupabaseConfigured();
  const isOwner = AuthService.hasRole(['owner']);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Supabase Backend & Data Migration</h3>
            <p className="text-xs text-slate-500">Safely preview, migrate, and synchronize browser data with PostgreSQL</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
          isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
          {isConfigured ? 'Supabase Configured' : 'Local Storage Mode'}
        </span>
      </div>

      {/* Migration Preview Card */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
            LocalStorage Records Available for Migration
          </span>
          <button
            onClick={loadPreview}
            disabled={loadingPreview}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingPreview ? 'animate-spin' : ''}`} />
            <span>Refresh Preview</span>
          </button>
        </div>

        {preview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.productsCount}</span>
              <span className="text-[11px] text-slate-500">Products</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.batchesCount}</span>
              <span className="text-[11px] text-slate-500">Batches</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.suppliersCount}</span>
              <span className="text-[11px] text-slate-500">Suppliers</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.customersCount}</span>
              <span className="text-[11px] text-slate-500">Customers</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.invoicesCount}</span>
              <span className="text-[11px] text-slate-500">Invoices</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="block text-base font-bold text-slate-900 font-mono">{preview.purchaseOrdersCount}</span>
              <span className="text-[11px] text-slate-500">POs</span>
            </div>
          </div>
        )}

        {preview?.warnings && preview.warnings.length > 0 && (
          <div className="space-y-1 pt-1">
            {preview.warnings.map((w, idx) => (
              <p key={idx} className="text-xs text-amber-800 flex items-start gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {isOwner
              ? 'Migrating uploads these records into PostgreSQL under your active store ID.'
              : 'Requires Store Owner role to trigger database migrations.'}
          </p>

          <button
            type="button"
            disabled={migrating || !isConfigured || !isOwner}
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{migrating ? 'Migrating Data...' : 'Migrate to Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Migration Result Banner */}
      {migrationResult && (
        <div className={`p-4 rounded-xl border ${
          migrationResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            {migrationResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{migrationResult.success ? 'Migration Completed Successfully' : 'Migration Failed'}</span>
          </div>
          <div className="text-xs space-y-1">
            <p>
              Migrated {migrationResult.migratedCounts.products || 0} products, {migrationResult.migratedCounts.batches || 0} batches, {migrationResult.migratedCounts.suppliers || 0} suppliers, and {migrationResult.migratedCounts.invoices || 0} invoices.
            </p>
            {migrationResult.errors.length > 0 && (
              <ul className="list-disc pl-5 text-rose-700 text-[11px] pt-1">
                {migrationResult.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* CSV Import & Export Tools */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-slate-500" /> Catalog & Sales Data Portability
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* CSV Export Buttons */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">Export Store Records</span>
            <p className="text-[11px] text-slate-500">Download formatted CSV reports of current inventory and sales invoices.</p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportProductsCsv}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Products CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportSalesCsv}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sales CSV</span>
              </button>
            </div>
          </div>

          {/* CSV Import Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-800 block">Import Products CSV</span>
            <p className="text-[11px] text-slate-500">Upload bulk product catalogs with validation and duplicate prevention.</p>
            <div className="pt-1">
              <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 w-full">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Select Products CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* CSV Preview and Commit Box */}
        {csvPreview && (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">
                CSV Preview: {csvPreview.validRows.length} Valid Rows, {csvPreview.rejectedRows.length} Rejected Rows
              </span>
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 underline"
              >
                Cancel
              </button>
            </div>

            {csvPreview.rejectedRows.length > 0 && (
              <div className="text-[11px] text-rose-700 bg-white p-2.5 rounded-lg border border-rose-200 max-h-24 overflow-y-auto">
                <p className="font-bold mb-1">Rejected rows summary:</p>
                {csvPreview.rejectedRows.map((rej: any, idx: number) => (
                  <p key={idx}>Row {rej.rowNumber} ({rej.identifier}): {rej.reason}</p>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={csvImporting || csvPreview.validRows.length === 0}
              onClick={handleCommitCsv}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {csvImporting ? 'Importing Products...' : `Confirm & Commit ${csvPreview.validRows.length} Products`}
            </button>
          </div>
        )}

        {csvResult && (
          <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            {csvResult}
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 max-w-sm w-full animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Confirm Database Migration</h3>
            <p className="text-xs text-slate-600 mb-4">
              This will safely synchronize {preview?.productsCount || 0} products, {preview?.batchesCount || 0} batches, and {preview?.invoicesCount || 0} invoices into Supabase PostgreSQL. Your local browser copy will NOT be deleted.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunMigration}
                className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
              >
                Yes, Migrate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
