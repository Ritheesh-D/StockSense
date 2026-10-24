// src/components/dashboard/RecentImportsCard.tsx
import React from 'react';
import { CsvImportSummary } from '../../utils/csvImportExport';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, ArrowUpRight, Clock } from 'lucide-react';

interface RecentImportsCardProps {
  recentImports: CsvImportSummary[];
  onOpenImportModal: () => void;
  onExportCsv: () => void;
}

export const RecentImportsCard: React.FC<RecentImportsCardProps> = ({
  recentImports,
  onOpenImportModal,
  onExportCsv
}) => {
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent CSV Imports</h3>
              <p className="text-xs text-slate-500">Catalog batch history & sync logs</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExportCsv}
              title="Export Inventory as CSV"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            >
              <Upload className="w-3 h-3" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>

        {/* List of recent imports */}
        {recentImports.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No CSV imports recorded yet. Click above to import your catalog.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentImports.slice(0, 3).map((imp) => (
              <div
                key={imp.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {imp.fileName}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(imp.timestamp)}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">+{imp.successCount} items</span>
                      {imp.duplicateCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600">{imp.duplicateCount} skipped</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 shrink-0">
                  {imp.totalRows} rows
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px] text-slate-400">Supports Product Name, Category, Min/Max & Price</span>
        <button
          type="button"
          onClick={onOpenImportModal}
          className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5 text-xs"
        >
          New Upload <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
