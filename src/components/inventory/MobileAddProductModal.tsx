// src/components/inventory/MobileAddProductModal.tsx
import React, { useState } from 'react';
import { Product, ProductCategory, Supplier } from '../../types';
import { X, Plus, Package, DollarSign, Tag, ShieldCheck, Check } from 'lucide-react';

interface MobileAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  onAddProduct: (product: Partial<Product>) => Promise<void>;
}

const CATEGORIES: ProductCategory[] = [
  'Food & Grains',
  'Beverages',
  'Snacks & Packaged',
  'Dairy & Bakery',
  'Personal Care',
  'Household Supplies',
  'Condiments & Spices'
];

export const MobileAddProductModal: React.FC<MobileAddProductModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  onAddProduct
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Food & Grains');
  const [stock, setStock] = useState<number>(20);
  const [minStock, setMinStock] = useState<number>(5);
  const [maxStock, setMaxStock] = useState<number>(40);
  const [sellingPrice, setSellingPrice] = useState<number>(120);
  const [purchasePrice, setPurchasePrice] = useState<number>(90);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || 'sup-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (stock < 0 || minStock < 0 || sellingPrice <= 0) {
      setError('Please provide valid positive numbers.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const sku = `SKU-${category.substring(0, 3).toUpperCase()}-${timestamp.toString().slice(-4)}`;
      const barcode = `890${timestamp.toString().slice(-9)}`;

      await onAddProduct({
        name: name.trim(),
        category,
        stock: Number(stock),
        minStock: Number(minStock),
        maxStock: Number(maxStock) || Number(minStock) * 4,
        sellingPrice: Number(sellingPrice),
        purchasePrice: Number(purchasePrice),
        unit: 'pcs',
        supplierId: supplierId || suppliers[0]?.id || 'sup-1',
        sku,
        barcode,
        lastRestockedDate: new Date().toISOString()
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Product</h3>
              <p className="text-xs text-slate-500">Quick product entry with health thresholds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Organic Almond Butter 250g"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-medium text-slate-800"
            />
          </div>

          {/* Category & Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 text-xs font-medium text-slate-800 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 text-xs font-medium text-slate-800 bg-white"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Metrics (Stock, Min, Max) */}
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Inventory Health Parameters
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Min Buffer
                </label>
                <input
                  type="number"
                  min="1"
                  value={minStock}
                  onChange={(e) => setMinStock(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-amber-700 text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Max Limit
                </label>
                <input
                  type="number"
                  min={minStock}
                  value={maxStock}
                  onChange={(e) => setMaxStock(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-blue-700 text-center"
                />
              </div>
            </div>
          </div>

          {/* Pricing (Selling Price vs Cost Price) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
