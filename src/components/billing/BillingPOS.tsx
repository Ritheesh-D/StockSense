import React, { useState, useEffect, useRef } from 'react';
import { Product, CartItem, Customer, StoreSettings, ProductCategory, Invoice, HeldBill } from '../../types';
import { StorageService } from '../../services/storageService';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { CustomerSelectorModal } from './CustomerSelectorModal';
import { HeldBillsModal } from './HeldBillsModal';
import { ManualDiscountModal } from './ManualDiscountModal';
import { QuickActionMenu } from './QuickActionMenu';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  Percent,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface BillingPOSProps {
  products: Product[];
  settings: StoreSettings;
  onRefreshData: () => void;
}

export const BillingPOS: React.FC<BillingPOSProps> = ({
  products,
  settings,
  onRefreshData
}) => {
  // POS Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Modals & Drawers
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalAddMode, setCustomerModalAddMode] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isHeldBillsOpen, setIsHeldBillsOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // References
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Held bills count
  const heldBills = StorageService.getHeldBills();

  // Clear scan feedback message after 2.5s
  useEffect(() => {
    if (scanMessage) {
      const timer = setTimeout(() => setScanMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [scanMessage]);

  // Categories list
  const categories: (ProductCategory | 'All')[] = [
    'All',
    'Food & Grains',
    'Beverages',
    'Snacks & Packaged',
    'Dairy & Bakery',
    'Personal Care',
    'Household Supplies',
    'Condiments & Spices'
  ];

  // Filtered Products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      query === '' ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode.includes(query);
    return matchesCategory && matchesSearch;
  });

  // Frequently sold / top items
  const popularProducts = products.slice(0, 5);

  // Barcode scanner handler (USB keyboard-wedge scanner hits enter)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const matchedProduct = products.find(p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase());
    if (matchedProduct) {
      if (matchedProduct.stock <= 0) {
        setScanMessage({ text: `"${matchedProduct.name}" is OUT OF STOCK.`, type: 'error' });
      } else {
        addToCart(matchedProduct);
        setScanMessage({ text: `Scanned & added: ${matchedProduct.name}`, type: 'success' });
      }
    } else {
      setScanMessage({ text: `No product found for barcode: ${code}`, type: 'error' });
    }
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        // Check available stock
        if (item.quantity >= product.stock) {
          setScanMessage({ text: `Cannot exceed available stock (${product.stock}) for ${product.name}`, type: 'error' });
          return prev;
        }
        const updated = [...prev];
        const newQty = item.quantity + 1;
        const lineTotal = (item.unitPrice * newQty) - (item.discountAmount * newQty);
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          lineTotal: Math.max(0, lineTotal)
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            discountAmount: 0,
            lineTotal: product.sellingPrice
          }
        ];
      }
    });
  };

  // Modify Cart Item Quantity
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock;
          const validQty = Math.min(newQty, maxStock);
          const lineTotal = (item.unitPrice * validQty) - (item.discountAmount * validQty);
          return {
            ...item,
            quantity: validQty,
            lineTotal: Math.max(0, lineTotal)
          };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // Clear Entire Cart
  const handleClearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setBillDiscountPercent(0);
    setClearConfirmOpen(false);
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;

    StorageService.holdBill({
      cartItems,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      billDiscountPercent
    });

    // Reset current cart
    setCartItems([]);
    setSelectedCustomer(null);
    setBillDiscountPercent(0);
    setScanMessage({ text: 'Bill held successfully! You can resume it anytime.', type: 'success' });
    onRefreshData();
  };

  // Resume Held Bill
  const handleResumeHeldBill = (held: HeldBill) => {
    setCartItems(held.cartItems);
    if (held.customerId) {
      const allCustomers = StorageService.getCustomers();
      const cust = allCustomers.find(c => c.id === held.customerId) || null;
      setSelectedCustomer(cust);
    } else {
      setSelectedCustomer(null);
    }
    setBillDiscountPercent(held.billDiscountPercent || 0);
    StorageService.removeHeldBill(held.id);
    setIsHeldBillsOpen(false);
    onRefreshData();
  };

  // Cart Totals Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const billDiscountAmount = Number(((subtotal * billDiscountPercent) / 100).toFixed(2));
  const discountedSubtotal = Math.max(0, subtotal - billDiscountAmount);

  const taxPercent = settings.taxEnabled ? settings.defaultTaxPercent : 0;
  const taxAmount = Number(((discountedSubtotal * taxPercent) / 100).toFixed(2));
  const grandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));

  // Current Invoice sequence preview
  const invoicePreviewNumber = `${settings.invoicePrefix}${String(settings.nextInvoiceSequence).padStart(4, '0')}`;

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-5 h-[calc(100vh-65px)] overflow-hidden">
      {/* ============================================================ */}
      {/* LEFT PANEL: PRODUCT CATALOG & BARCODE (60% Desktop)           */}
      {/* ============================================================ */}
      <section className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs min-w-0">
        {/* Top Control Bar: Search & Barcode Scan */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode (Enter)..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded transition-colors"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Quick scan status toast */}
          {scanMessage && (
            <div
              className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {scanMessage.type === 'success' ? <Check className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
              <span className="font-medium">{scanMessage.text}</span>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Frequently Sold Section (quick picks) */}
        {selectedCategory === 'All' && !searchQuery && (
          <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Quick Picks:
            </span>
            <div className="flex items-center gap-1.5">
              {popularProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-semibold text-slate-800 shrink-0 transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200"
                >
                  + {p.name.split(' ')[0]} ({settings.currencySymbol}{p.sellingPrice})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="p-3.5 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No products match your search</p>
              <p className="text-xs text-slate-400 mt-1">Try another category, SKU, or clear filters.</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= product.minStock;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative group ${
                    isOutOfStock
                      ? 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 hover:border-emerald-500 hover:shadow-xs bg-white cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                        {product.sku}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                          OUT
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {product.stock} left
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-medium text-slate-400">
                          {product.stock} {product.unit}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {settings.currencySymbol}{product.sellingPrice.toFixed(2)}
                    </span>
                    {!isOutOfStock && (
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* RIGHT PANEL: CURRENT BILL & CHECKOUT (40% Desktop)           */}
      {/* ============================================================ */}
      <section className="w-full lg:w-[420px] xl:w-[460px] bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden shrink-0">
        {/* Bill Header */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current Bill
              </span>
              <p className="text-sm font-bold text-slate-900 font-mono">{invoicePreviewNumber}</p>
            </div>

            {/* Held Bills & Clear actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsHeldBillsOpen(true)}
                className="relative px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
                title="View held bills"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Held</span>
                {heldBills.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                    {heldBills.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-lg flex items-center gap-1 transition-colors"
                title="Hold this bill for later"
              >
                <span>Hold</span>
              </button>

              <button
                type="button"
                onClick={() => setClearConfirmOpen(true)}
                disabled={cartItems.length === 0}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 rounded-lg transition-colors"
                title="Clear current cart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Customer Selection Bar */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-slate-800">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                </span>
                {selectedCustomer && (
                  <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                    ({selectedCustomer.phone})
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 shrink-0"
            >
              {selectedCustomer ? 'Change' : '+ Customer'}
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-12 h-12 text-slate-200 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700">Billing Cart is Empty</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                Click items in the product catalog or scan barcodes to begin a sale.
              </p>
            </div>
          ) : (
            cartItems.map(item => (
              <div
                key={item.product.id}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono">{settings.currencySymbol}{item.unitPrice.toFixed(2)}</span>
                    <span>×</span>
                    <span className="font-semibold text-slate-800">{item.quantity}</span>
                    <span>=</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {settings.currencySymbol}{item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700"
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <span className="w-7 text-center font-bold text-xs font-mono text-slate-900">
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-6 h-6 ml-1 text-slate-400 hover:text-rose-600 rounded flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary Calculations */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-xs text-slate-600">
            <span>Subtotal ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
            <span className="font-mono font-semibold text-slate-800">
              {settings.currencySymbol}{subtotal.toFixed(2)}
            </span>
          </div>

          {/* Discount Field */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bill Discount:</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setBillDiscountPercent(pct)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                      billDiscountPercent === pct
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors border ${
                    ![0, 5, 10].includes(billDiscountPercent)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Enter custom percentage or flat discount"
                >
                  {![0, 5, 10].includes(billDiscountPercent) ? `${billDiscountPercent}%` : '+ Custom'}
                </button>
              </div>
            </div>
            {billDiscountAmount > 0 ? (
              <span className="font-mono font-semibold text-emerald-700">
                -{settings.currencySymbol}{billDiscountAmount.toFixed(2)}
              </span>
            ) : (
              <span className="text-slate-400 font-mono">0.00</span>
            )}
          </div>

          {/* Tax Field */}
          {settings.taxEnabled && (
            <div className="flex justify-between text-xs text-slate-600">
              <span>{settings.taxLabel || 'Tax'} ({taxPercent}%):</span>
              <span className="font-mono font-semibold text-slate-800">
                +{settings.currencySymbol}{taxAmount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Final Grand Total Prominent Banner */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Payable
              </span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {settings.currencySymbol}{grandTotal.toFixed(2)}
              </p>
            </div>

            {/* Complete Sale CTA */}
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="py-3 px-5 sm:px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Checkout</span>
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal to Clear Cart */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-sm w-full animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-base mb-1">Clear Current Bill?</h3>
            <p className="text-xs text-slate-600 mb-4">
              All {cartItems.length} items in the counter bill will be removed. You can also hold the bill instead.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClearConfirmOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Keep Bill
              </button>
              <button
                type="button"
                onClick={handleClearCart}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        billDiscountPercent={billDiscountPercent}
        billDiscountAmount={billDiscountAmount}
        taxPercent={taxPercent}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        customer={selectedCustomer}
        settings={settings}
        onSaleComplete={(invoice) => {
          setIsCheckoutOpen(false);
          setCompletedInvoice(invoice);
          setIsReceiptOpen(true);
          // Reset cart
          setCartItems([]);
          setSelectedCustomer(null);
          setBillDiscountPercent(0);
          onRefreshData();
        }}
      />

      {/* Receipt & Thermal Print Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        invoice={completedInvoice}
        settings={settings}
        onStartNewSale={() => {
          setIsReceiptOpen(false);
          setCompletedInvoice(null);
          barcodeInputRef.current?.focus();
        }}
      />

      {/* Customer Selector Modal */}
      <CustomerSelectorModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerModalAddMode(false);
        }}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
        initialAddMode={customerModalAddMode}
      />

      {/* Manual Discount Adjuster Modal */}
      <ManualDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        currentDiscountPercent={billDiscountPercent}
        subtotal={subtotal}
        currencySymbol={settings.currencySymbol}
        onApplyDiscount={(newPct) => {
          setBillDiscountPercent(newPct);
          setScanMessage({ text: `Bill discount updated to ${newPct}%`, type: 'success' });
        }}
      />

      {/* Held Bills Modal */}
      <HeldBillsModal
        isOpen={isHeldBillsOpen}
        onClose={() => setIsHeldBillsOpen(false)}
        heldBills={heldBills}
        onResumeHeldBill={handleResumeHeldBill}
        onDeleteHeldBill={(id) => {
          StorageService.removeHeldBill(id);
          onRefreshData();
        }}
        currencySymbol={settings.currencySymbol}
      />

      {/* Floating Quick Action Menu */}
      <QuickActionMenu
        onAddNewCustomer={() => {
          setCustomerModalAddMode(true);
          setIsCustomerModalOpen(true);
        }}
        onAdjustManualDiscount={() => {
          setIsDiscountModalOpen(true);
        }}
        onToggleHoldBill={() => {
          if (cartItems.length > 0) {
            handleHoldBill();
          } else if (heldBills.length > 0) {
            handleResumeHeldBill(heldBills[0]);
          } else {
            setScanMessage({ text: 'No active cart to hold or held bills to resume.', type: 'error' });
          }
        }}
        onResumeHeldBill={() => {
          setIsHeldBillsOpen(true);
        }}
        onFocusBarcode={() => {
          barcodeInputRef.current?.focus();
          setScanMessage({ text: 'Barcode scanner focused! Ready for scanner.', type: 'success' });
        }}
        onClearBill={() => {
          setClearConfirmOpen(true);
        }}
        onQuickCheckout={() => {
          if (cartItems.length > 0) {
            setIsCheckoutOpen(true);
          }
        }}
        hasCartItems={cartItems.length > 0}
        heldBillsCount={heldBills.length}
        currentDiscountPercent={billDiscountPercent}
      />
    </div>
  );
};
