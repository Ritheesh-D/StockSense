import React, { useState } from 'react';
import { Invoice, StoreSettings } from '../../types';
import { Printer, Download, Plus, CheckCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings: StoreSettings;
  onStartNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  settings,
  onStartNewSale
}) => {
  const [printLayout, setPrintLayout] = useState<'80mm' | '58mm' | 'a4'>(settings.receiptSize || '80mm');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${invoice.invoiceNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Product', 'SKU', 'Quantity', 'Rate', 'Total', 'Payment Method'];
    const rows = invoice.items.map(item => [
      invoice.invoiceNumber,
      invoice.createdAt,
      invoice.customerName || 'Walk-in',
      `"${item.name.replace(/"/g, '""')}"`,
      item.sku,
      item.quantity,
      item.unitPrice,
      item.lineTotal,
      invoice.payment.method
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${invoice.invoiceNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const invoiceDate = new Date(invoice.createdAt);
  const formattedDate = invoiceDate.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = invoiceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[95vh]">
        {/* Top Action Bar (hidden in print) */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-bold text-sm">Sale Completed Successfully!</p>
              <p className="text-[11px] text-slate-300 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>

          {/* Paper Size selector */}
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setPrintLayout('80mm')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                printLayout === '80mm' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              80mm Thermal
            </button>
            <button
              onClick={() => setPrintLayout('58mm')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                printLayout === '58mm' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              58mm Thermal
            </button>
            <button
              onClick={() => setPrintLayout('a4')}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                printLayout === 'a4' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              A4 Invoice
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 flex justify-center">
          <div
            id="printable-receipt-container"
            className={`bg-white shadow-md border border-slate-200 p-6 text-slate-900 transition-all ${
              printLayout === '58mm'
                ? 'max-w-[320px] text-xs font-mono'
                : printLayout === '80mm'
                ? 'max-w-[420px] text-xs font-mono'
                : 'w-full max-w-[650px] text-sm font-sans'
            }`}
          >
            {/* Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase text-slate-900">
                {settings.storeName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-slate-600 italic mt-0.5">{settings.tagline}</p>
              )}
              <p className="text-[11px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[11px] text-slate-600">Ph: {settings.phone}</p>
              {settings.taxRegistrationNumber && (
                <p className="text-[11px] font-mono font-semibold text-slate-700 mt-0.5">
                  GSTIN / TAX: {settings.taxRegistrationNumber}
                </p>
              )}
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice No:</span>
                <span className="font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-800">{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="text-slate-800">{invoice.payment.cashierName || 'Cashier'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {invoice.customerName} {invoice.customerPhone ? `(${invoice.customerPhone})` : ''}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-3">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500 text-left">
                    <th className="pb-1 font-semibold">Item</th>
                    <th className="pb-1 font-semibold text-center">Qty</th>
                    <th className="pb-1 font-semibold text-right">Rate</th>
                    <th className="pb-1 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1.5 pr-2">
                        <p className="font-medium text-slate-900 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                      </td>
                      <td className="py-1.5 text-center font-mono align-top">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono align-top">
                        {settings.currencySymbol}{item.unitPrice.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold text-slate-900 align-top">
                        {settings.currencySymbol}{item.lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{settings.currencySymbol}{invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.billDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({invoice.billDiscountPercent}%):</span>
                  <span className="font-mono">-{settings.currencySymbol}{invoice.billDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({invoice.taxPercent}%):</span>
                  <span className="font-mono">+{settings.currencySymbol}{invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm sm:text-base font-bold text-slate-950 pt-2 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">{settings.currencySymbol}{invoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mt-3 pt-2 border-t border-dashed border-slate-300 text-[11px] space-y-0.5">
              <div className="flex justify-between text-slate-700">
                <span>Payment Mode:</span>
                <span className="uppercase font-semibold">{invoice.payment.method}</span>
              </div>
              {invoice.payment.method === 'cash' && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Cash Tendered:</span>
                    <span className="font-mono">{settings.currencySymbol}{invoice.payment.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-semibold">
                    <span>Change Returned:</span>
                    <span className="font-mono">{settings.currencySymbol}{invoice.payment.changeGiven.toFixed(2)}</span>
                  </div>
                </>
              )}
              {invoice.payment.transactionRef && (
                <div className="flex justify-between text-slate-500">
                  <span>Ref / UTR:</span>
                  <span className="font-mono">{invoice.payment.transactionRef}</span>
                </div>
              )}
            </div>

            {/* Thank you note */}
            <div className="mt-5 pt-3 border-t border-slate-200 text-center space-y-1">
              <p className="text-[11px] font-semibold text-slate-800">{settings.footerMessage}</p>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest">
                * * * * * * * * * * * * * *
              </p>
              <p className="text-[9px] text-slate-400">Powered by StockSense Retail</p>
            </div>
          </div>
        </div>

        {/* Footer Actions (hidden in print) */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onStartNewSale}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Next Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
