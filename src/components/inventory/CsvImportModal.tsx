// src/components/inventory/CsvImportModal.tsx
import React, { useState, useRef } from 'react';
import { Product, Supplier } from '../../types';
import { 
  generateSampleCsv, 
  downloadCsvFile, 
  parseAndValidateCsv, 
  CsvParsedRow, 
  CsvImportSummary 
} from '../../utils/csvImportExport';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Check,
  FileSpreadsheet
} from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  suppliers: Supplier[];
  onImportComplete: (newProducts: Partial<Product>[], summary: CsvImportSummary) => Promise<void>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  suppliers,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<CsvParsedRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const sample = generateSampleCsv();
    downloadCsvFile('stocksense_inventory_sample.csv', sample);
  };

  const processFile = (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith('.csv')) {
      setParseError('Please upload a valid .csv file.');
      return;
    }

    setFile(uploadedFile);
    setParseError(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseAndValidateCsv(text, existingProducts);
        if (rows.length === 0) {
          setParseError('The uploaded CSV file is empty or missing data rows.');
        } else {
          setParsedRows(rows);
        }
      } catch (err: any) {
        setParseError(`Failed to parse CSV: ${err.message || 'Unknown format error'}`);
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const validRows = parsedRows.filter(r => r.isValid && (!skipDuplicates || !r.isDuplicate));
  const duplicateRows = parsedRows.filter(r => r.isDuplicate);
  const errorRows = parsedRows.filter(r => !r.isValid);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;

    setIsProcessing(true);
    try {
      // Map rows to Product partials
      const defaultSupplierId = suppliers[0]?.id || 'sup-1';
      const supplierMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s.id]));

      const productsToCreate: Partial<Product>[] = validRows.map((row, idx) => {
        const supId = supplierMap.get(row.supplier.toLowerCase()) || defaultSupplierId;
        const timestamp = Date.now();
        const randSku = `SKU-${row.category.substring(0, 3).toUpperCase()}-${timestamp.toString().slice(-4)}${idx}`;
        const randBarcode = `890${timestamp.toString().slice(-9)}${idx}`;

        return {
          name: row.productName,
          category: row.category,
          stock: row.currentStock,
          minStock: row.minStock,
          maxStock: row.maxStock,
          sellingPrice: row.unitPrice,
          purchasePrice: Number((row.unitPrice * 0.75).toFixed(2)), // standard 25% margin
          unit: 'pcs',
          supplierId: supId,
          sku: randSku,
          barcode: randBarcode,
          lastRestockedDate: new Date().toISOString()
        };
      });

      const summary: CsvImportSummary = {
        id: `import-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fileName: file?.name || 'inventory.csv',
        totalRows: parsedRows.length,
        successCount: productsToCreate.length,
        duplicateCount: duplicateRows.length,
        errorCount: errorRows.length
      };

      await onImportComplete(productsToCreate, summary);
      setImportSummary(summary);
    } catch (err: any) {
      setParseError(`Import failed: ${err.message || 'Database error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
    setParseError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Products from CSV</h2>
              <p className="text-xs text-slate-500">Bulk upload catalog items with validation & duplicate checks</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {importSummary ? (
            /* Success Summary View */
            <div className="text-center py-8 space-y-5 animate-scale-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Inventory Successfully Imported!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Products have been validated and saved directly to your database.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Parsed Rows</div>
                  <div className="text-xl font-bold text-slate-800">{importSummary.totalRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-semibold text-emerald-600 uppercase">Imported</div>
                  <div className="text-xl font-bold text-emerald-700">{importSummary.successCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-semibold text-amber-600 uppercase">Duplicates</div>
                  <div className="text-xl font-bold text-amber-700">{importSummary.duplicateCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-[11px] font-semibold text-red-600 uppercase">Errors</div>
                  <div className="text-xl font-bold text-red-700">{importSummary.errorCount}</div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Upload Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  Done & View Inventory
                </button>
              </div>
            </div>
          ) : parsedRows.length === 0 ? (
            /* Upload / Drag-and-Drop Area */
            <div className="space-y-4">
              {/* Sample Download Bar */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-900">Need a template?</div>
                    <div className="text-[11px] text-blue-700">Download our formatted CSV template with required fields.</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Click to upload or drag & drop CSV file
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Required columns: Product Name, Category, Current Stock, Minimum Stock, Maximum Stock, Unit Price, Supplier
                </p>
                <span className="inline-block mt-3 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-medium text-slate-600">
                  Maximum file size: 5MB (.csv)
                </span>
              </div>

              {parseError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : (
            /* Preview & Validation Table */
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{file?.name}</span>
                  <span className="text-xs text-slate-400">({parsedRows.length} rows detected)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {validRows.length} Valid
                  </span>
                  {duplicateRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {duplicateRows.length} Duplicates
                    </span>
                  )}
                  {errorRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                      {errorRows.length} Errors
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Skip duplicate products (prevents accidental stock overwrite)</span>
                </label>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 pl-3">Status</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Stock</th>
                      <th className="p-2.5">Min/Max</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          !row.isValid
                            ? 'bg-red-50/60'
                            : row.isDuplicate
                            ? 'bg-amber-50/50'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="p-2.5 pl-3 whitespace-nowrap">
                          {!row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3" /> Error
                            </span>
                          ) : row.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <AlertTriangle className="w-3 h-3" /> Duplicate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900 max-w-[160px] truncate">
                          {row.productName || <span className="text-red-500 italic">Missing Name</span>}
                          {row.errors.length > 0 && (
                            <div className="text-[10px] text-red-600">{row.errors.join(', ')}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">{row.category}</td>
                        <td className="p-2.5 font-bold text-slate-800">{row.currentStock}</td>
                        <td className="p-2.5 text-slate-500">
                          {row.minStock} / {row.maxStock}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">₹{row.unitPrice.toFixed(2)}</td>
                        <td className="p-2.5 text-slate-600 max-w-[120px] truncate">{row.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!importSummary && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>

            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isProcessing || validRows.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing {validRows.length} SKUs...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Import ({validRows.length} Items)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
