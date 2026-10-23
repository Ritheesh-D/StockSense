import React, { useState } from 'react';
import { Invoice, StoreSettings } from '../../types';
import { StorageService } from '../../services/storageService';
import { ReceiptModal } from '../billing/ReceiptModal';
import { ReturnModal } from './ReturnModal';
import {
  Search,
  Download,
  Printer,
  RotateCcw,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SalesHistoryProps {
  settings: StoreSettings;
  onRefreshData: () => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  settings,
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [isReturnOpen, setIsReturnOpen] = useState(false);

  const invoices = StorageService.getInvoices();
  const returns = StorageService.getReturns();

  // Date filtering
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filteredInvoices = invoices.filter(inv => {
    // Search
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      q === '' ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.includes(q)) ||
      inv.items.some(i => i.name.toLowerCase().includes(q));

    // Date
    let matchesDate = true;
    const invDate = new Date(inv.createdAt);
    if (dateFilter === 'today') {
      matchesDate = inv.createdAt.startsWith(todayStr);
    } else if (dateFilter === '7days') {
      matchesDate = invDate >= sevenDaysAgo;
    } else if (dateFilter === '30days') {
      matchesDate = invDate >= thirtyDaysAgo;
    }

    // Method
    const matchesMethod = methodFilter === 'all' || inv.payment.method === methodFilter;

    return matchesSearch && matchesDate && matchesMethod;
  });

  // Calculate Metrics
  const totalVolume = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalRefunds = returns.reduce((sum, r) => sum + r.totalRefund, 0);
  const netRevenue = Math.max(0, totalVolume - totalRefunds);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Invoice Number',
      'Date & Time',
      'Customer Name',
      'Phone',
      'Items Count',
      'Subtotal',
      'Discount',
      'Tax',
      'Grand Total',
      'Payment Method',
      'Status'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.createdAt).toLocaleString(),
      `"${inv.customerName || 'Walk-in'}"`,
      inv.customerPhone || 'N/A',
      inv.items.reduce((acc, i) => acc + i.quantity, 0),
      inv.subtotal.toFixed(2),
      inv.billDiscountAmount.toFixed(2),
      inv.taxAmount.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.payment.method,
      inv.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocksense_sales_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Invoices</span>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {filteredInvoices.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Sales Volume</span>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              {settings.currencySymbol}{totalVolume.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Total Refunds</span>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
              {settings.currencySymbol}{totalRefunds.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Net Revenue</span>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {settings.currencySymbol}{netRevenue.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Strip: Search, Date Filter, Method Filter & CSV Export */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, or item..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                dateFilter === '30days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>

          {/* Payment Method filter */}
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:outline-none focus:border-emerald-500 text-slate-700"
          >
            <option value="all">All Payment Modes</option>
            <option value="cash">Cash Only</option>
            <option value="upi">UPI Only</option>
            <option value="card">Card Only</option>
          </select>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Invoices Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or record a new sale in POS.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(invoice => {
                  const invDate = new Date(invoice.createdAt);
                  const formattedDateTime = `${invDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${invDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                  const totalItemsCount = invoice.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {invoice.invoiceNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formattedDateTime}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 truncate max-w-[150px]">
                          {invoice.customerName}
                        </p>
                        {invoice.customerPhone && (
                          <p className="text-[11px] text-slate-400 font-mono">{invoice.customerPhone}</p>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                          {totalItemsCount}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        <span className="uppercase text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono">
                          {invoice.payment.method}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {settings.currencySymbol}{invoice.grandTotal.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {invoice.status === 'completed' && (
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Completed
                          </span>
                        )}
                        {invoice.status === 'returned_partial' && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Partially Returned
                          </span>
                        )}
                        {invoice.status === 'returned_full' && (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Fully Returned
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsReceiptOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View / Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {invoice.status !== 'returned_full' && (
                            <button
                              onClick={() => {
                                setReturnInvoice(invoice);
                                setIsReturnOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Process Return / Refund"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt View Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        settings={settings}
        onStartNewSale={() => {
          setIsReceiptOpen(false);
          setSelectedInvoice(null);
        }}
      />

      {/* Return Modal */}
      <ReturnModal
        isOpen={isReturnOpen}
        onClose={() => {
          setIsReturnOpen(false);
          setReturnInvoice(null);
        }}
        invoice={returnInvoice}
        settings={settings}
        onReturnSuccess={() => {
          onRefreshData();
        }}
      />
    </div>
  );
};
