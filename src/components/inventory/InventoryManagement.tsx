import React, { useState } from 'react';
import { Product, StoreSettings, ProductCategory, Supplier } from '../../types';
import { ProductRepository } from '../../services/productRepository';
import { CsvService } from '../../services/csvService';
import { StorageService } from '../../services/storageService';
import { CsvImportModal } from './CsvImportModal';
import { exportProductsToCsv, CsvImportSummary } from '../../utils/csvImportExport';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Layers,
  Check,
  AlertTriangle,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface InventoryManagementProps {
  products: Product[];
  settings: StoreSettings;
  suppliers?: Supplier[];
  onRefreshData: () => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  products,
  settings,
  suppliers = [],
  onRefreshData
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // CSV Import Modal
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Product Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Food & Grains');
  const [formPurchasePrice, setFormPurchasePrice] = useState<string>('');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('');
  const [formStock, setFormStock] = useState<string>('');
  const [formMinStock, setFormMinStock] = useState<string>('');
  const [formUnit, setFormUnit] = useState('pack');

  const categories: ProductCategory[] = [
    'Food & Grains',
    'Beverages',
    'Snacks & Packaged',
    'Dairy & Bakery',
    'Personal Care',
    'Household Supplies',
    'Condiments & Spices'
  ];

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setFormCategory('Food & Grains');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormStock('20');
    setFormMinStock('10');
    setFormUnit('pack');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormBarcode(prod.barcode);
    setFormCategory(prod.category);
    setFormPurchasePrice(prod.purchasePrice.toString());
    setFormSellingPrice(prod.sellingPrice.toString());
    setFormStock(prod.stock.toString());
    setFormMinStock(prod.minStock.toString());
    setFormUnit(prod.unit);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const purchase = parseFloat(formPurchasePrice) || 0;
    const selling = parseFloat(formSellingPrice) || 0;
    const stock = parseInt(formStock) || 0;
    const minStock = parseInt(formMinStock) || 5;

    if (!formName.trim() || !formSku.trim()) return;

    if (editingProduct) {
      const res = await ProductRepository.updateProduct({
        ...editingProduct,
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        category: formCategory,
        purchasePrice: purchase,
        sellingPrice: selling,
        stock: Math.max(0, stock),
        minStock: Math.max(1, minStock),
        unit: formUnit.trim() || 'pcs'
      });
      if (res.error) {
        alert(res.error);
        return;
      }
    } else {
      const res = await ProductRepository.createProduct({
        name: formName.trim(),
        sku: formSku.trim(),
        barcode: formBarcode.trim(),
        category: formCategory,
        purchasePrice: purchase,
        sellingPrice: selling,
        stock: Math.max(0, stock),
        minStock: Math.max(1, minStock),
        unit: formUnit.trim() || 'pcs',
        supplierId: 'sup-1',
        lastRestockedDate: new Date().toISOString().split('T')[0]
      });
      if (res.error) {
        alert(res.error);
        return;
      }
    }

    setIsModalOpen(false);
    onRefreshData();
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      const res = await ProductRepository.deleteProduct(id);
      if (!res.success && res.error) {
        alert(res.error);
      } else {
        onRefreshData();
      }
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'SKU', 'Barcode', 'Name', 'Category', 'Purchase Price', 'Selling Price', 'Stock', 'Min Stock', 'Unit'];
    const rows = products.map(p => [
      p.id,
      p.sku,
      p.barcode,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.purchasePrice,
      p.sellingPrice,
      p.stock,
      p.minStock,
      p.unit
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stocksense_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Filtered Products
  const filtered = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q);

    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'low') matchesStock = p.stock > 0 && p.stock <= p.minStock;
    if (stockStatusFilter === 'out') matchesStock = p.stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Controls: Search, Filters & Action Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name, SKU, or barcode..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white font-medium focus:outline-none focus:border-emerald-500 text-slate-700"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockStatusFilter}
            onChange={e => setStockStatusFilter(e.target.value as 'all' | 'low' | 'out')}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white font-medium focus:outline-none focus:border-emerald-500 text-slate-700"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock Only</option>
            <option value="out">Out of Stock Only</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={() => exportProductsToCsv(products, suppliers)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
            title="Export Inventory as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Import Products CSV */}
          <button
            onClick={() => setIsCsvImportOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Products</span>
          </button>

          {/* Add Product */}
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Min Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or add a new item.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const isOut = product.stock <= 0;
                  const isLow = !isOut && product.stock <= product.minStock;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 leading-tight">{product.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {product.sku} · Barcode: {product.barcode}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-slate-600">
                        {product.category}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {settings.currencySymbol}{product.purchasePrice.toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {settings.currencySymbol}{product.sellingPrice.toFixed(2)}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs inline-block ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {product.stock} {product.unit}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {product.minStock} {product.unit}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Maggi Noodles 280g"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={e => setFormBarcode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="pack, bottle, kg"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPurchasePrice}
                    onChange={e => setFormPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price ({settings.currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formSellingPrice}
                    onChange={e => setFormSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold text-emerald-800 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMinStock}
                    onChange={e => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        existingProducts={products}
        suppliers={suppliers}
        onImportComplete={async (newItems, summary) => {
          for (const item of newItems) {
            await ProductRepository.createProduct(item as any);
          }
          StorageService.saveRecentImport(summary);
          onRefreshData();
        }}
      />
    </div>
  );
};
