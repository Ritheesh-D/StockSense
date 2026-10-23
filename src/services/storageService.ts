import {
  Product,
  InventoryBatch,
  Customer,
  CartItem,
  Invoice,
  InvoiceLineItem,
  ReturnRecord,
  ReturnItemDetail,
  PurchaseOrder,
  Supplier,
  StoreSettings,
  HeldBill,
  ActivityLog,
  PaymentMethod
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_INVOICES,
  INITIAL_SETTINGS
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'stocksense_products_v2',
  BATCHES: 'stocksense_batches_v2',
  SUPPLIERS: 'stocksense_suppliers_v2',
  CUSTOMERS: 'stocksense_customers_v2',
  INVOICES: 'stocksense_invoices_v2',
  RETURNS: 'stocksense_returns_v2',
  PURCHASE_ORDERS: 'stocksense_purchase_orders_v2',
  SETTINGS: 'stocksense_settings_v2',
  HELD_BILLS: 'stocksense_held_bills_v2',
  ACTIVITY_LOG: 'stocksense_activity_log_v2'
};

const fallbackMemStore = new Map<string, string>();

function safeGet<T>(key: string, fallback: T): T {
  try {
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.getItem === 'function') {
      const data = window.localStorage.getItem(key);
      if (!data) return fallback;
      return JSON.parse(data) as T;
    }
    const memData = fallbackMemStore.get(key);
    if (!memData) return fallback;
    return JSON.parse(memData) as T;
  } catch (err) {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    const json = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage && typeof window.localStorage.setItem === 'function') {
      window.localStorage.setItem(key, json);
    }
    fallbackMemStore.set(key, json);
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export class StorageService {
  // Products
  static getProducts(): Product[] {
    return safeGet<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static saveProducts(products: Product[]): void {
    safeSet(STORAGE_KEYS.PRODUCTS, products);
  }

  static updateProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    this.saveProducts(products);
  }

  static deleteProduct(productId: string): void {
    const products = this.getProducts().filter(p => p.id !== productId);
    this.saveProducts(products);
  }

  // Batches
  static getBatches(): InventoryBatch[] {
    return safeGet<InventoryBatch[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  }

  static saveBatches(batches: InventoryBatch[]): void {
    safeSet(STORAGE_KEYS.BATCHES, batches);
  }

  // Suppliers
  static getSuppliers(): Supplier[] {
    return safeGet<Supplier[]>(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
  }

  static saveSuppliers(suppliers: Supplier[]): void {
    safeSet(STORAGE_KEYS.SUPPLIERS, suppliers);
  }

  // Customers
  static getCustomers(): Customer[] {
    return safeGet<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }

  static saveCustomers(customers: Customer[]): void {
    safeSet(STORAGE_KEYS.CUSTOMERS, customers);
  }

  static addCustomer(customer: Omit<Customer, 'id' | 'totalSpent' | 'totalVisits'>): Customer {
    const customers = this.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      totalSpent: 0,
      totalVisits: 0
    };
    customers.push(newCustomer);
    this.saveCustomers(customers);
    return newCustomer;
  }

  // Settings
  static getSettings(): StoreSettings {
    return safeGet<StoreSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  }

  static saveSettings(settings: StoreSettings): void {
    safeSet(STORAGE_KEYS.SETTINGS, settings);
  }

  // Invoices & Sales
  static getInvoices(): Invoice[] {
    return safeGet<Invoice[]>(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
  }

  static saveInvoices(invoices: Invoice[]): void {
    safeSet(STORAGE_KEYS.INVOICES, invoices);
  }

  // Returns
  static getReturns(): ReturnRecord[] {
    return safeGet<ReturnRecord[]>(STORAGE_KEYS.RETURNS, []);
  }

  static saveReturns(returns: ReturnRecord[]): void {
    safeSet(STORAGE_KEYS.RETURNS, returns);
  }

  // Held Bills
  static getHeldBills(): HeldBill[] {
    return safeGet<HeldBill[]>(STORAGE_KEYS.HELD_BILLS, []);
  }

  static saveHeldBills(heldBills: HeldBill[]): void {
    safeSet(STORAGE_KEYS.HELD_BILLS, heldBills);
  }

  static holdBill(heldBill: Omit<HeldBill, 'id' | 'heldAt'>): HeldBill {
    const heldBills = this.getHeldBills();
    const newHeld: HeldBill = {
      ...heldBill,
      id: `held-${Date.now()}`,
      heldAt: new Date().toISOString()
    };
    heldBills.push(newHeld);
    this.saveHeldBills(heldBills);
    return newHeld;
  }

  static removeHeldBill(id: string): void {
    const heldBills = this.getHeldBills().filter(h => h.id !== id);
    this.saveHeldBills(heldBills);
  }

  // Purchase Orders
  static getPurchaseOrders(): PurchaseOrder[] {
    return safeGet<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS);
  }

  static savePurchaseOrders(orders: PurchaseOrder[]): void {
    safeSet(STORAGE_KEYS.PURCHASE_ORDERS, orders);
  }

  static receivePurchaseOrder(orderId: string): { success: boolean; message: string } {
    const orders = this.getPurchaseOrders();
    const po = orders.find(o => o.id === orderId);
    if (!po) return { success: false, message: 'Purchase order not found.' };
    if (po.status === 'received') return { success: false, message: 'Order has already been received.' };

    const products = this.getProducts();

    // Restock each product
    po.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        p.stock += item.quantity;
        p.lastRestockedDate = new Date().toISOString().split('T')[0];
      }
    });

    po.status = 'received';
    po.receivedDate = new Date().toISOString().split('T')[0];

    this.savePurchaseOrders(orders);
    this.saveProducts(products);

    this.logActivity({
      type: 'po_received',
      description: `Received Purchase Order ${po.orderNumber} from ${po.supplierName} (${po.items.length} items)`,
      amount: po.totalAmount,
      user: 'Admin'
    });

    return { success: true, message: `PO ${po.orderNumber} received. Inventory stocks updated.` };
  }

  // Activity Log
  static getActivityLogs(): ActivityLog[] {
    return safeGet<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOG, [
      {
        id: 'act-1',
        timestamp: '2026-10-23T11:20:00Z',
        type: 'sale',
        description: 'Invoice INV-2026-0040 completed',
        amount: 75.00,
        user: 'Admin'
      },
      {
        id: 'act-2',
        timestamp: '2026-10-21T14:30:00Z',
        type: 'po_received',
        description: 'Received PO-2026-002 from Beverages Co',
        amount: 4000.00,
        user: 'Admin'
      }
    ]);
  }

  static logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      ...entry,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep last 100 entries
    if (logs.length > 100) logs.pop();
    safeSet(STORAGE_KEYS.ACTIVITY_LOG, logs);
  }

  // Atomic Checkout Process
  static checkoutSale(params: {
    cartItems: CartItem[];
    subtotal: number;
    billDiscountPercent: number;
    billDiscountAmount: number;
    taxPercent: number;
    taxAmount: number;
    grandTotal: number;
    payment: {
      method: PaymentMethod;
      amountPaid: number;
      changeGiven: number;
      transactionRef?: string;
    };
    customer?: Customer | null;
    notes?: string;
  }): { success: boolean; invoice?: Invoice; error?: string } {
    if (!params.cartItems || params.cartItems.length === 0) {
      return { success: false, error: 'Cart is empty.' };
    }

    const currentProducts = this.getProducts();

    // 1. Strict Stock Validation
    for (const item of params.cartItems) {
      const product = currentProducts.find(p => p.id === item.product.id);
      if (!product) {
        return { success: false, error: `Product "${item.product.name}" no longer exists in catalog.` };
      }
      if (product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}.`
        };
      }
    }

    // 2. Validate Payment
    if (params.payment.amountPaid < params.grandTotal && params.payment.method === 'cash') {
      return {
        success: false,
        error: `Amount paid (₹${params.payment.amountPaid.toFixed(2)}) is less than total payable (₹${params.grandTotal.toFixed(2)}).`
      };
    }

    // 3. Generate Unique Invoice Number
    const settings = this.getSettings();
    const invoiceNumber = `${settings.invoicePrefix}${String(settings.nextInvoiceSequence).padStart(4, '0')}`;

    // 4. Build Invoice Line Items
    const lineItems: InvoiceLineItem[] = params.cartItems.map(item => ({
      productId: item.product.id,
      sku: item.product.sku,
      barcode: item.product.barcode,
      name: item.product.name,
      category: item.product.category,
      unitPrice: item.unitPrice,
      purchasePrice: item.product.purchasePrice,
      quantity: item.quantity,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal
    }));

    // 5. Create Invoice Object
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      createdAt: new Date().toISOString(),
      customerId: params.customer?.id,
      customerName: params.customer?.name || 'Walk-in Customer',
      customerPhone: params.customer?.phone,
      items: lineItems,
      subtotal: params.subtotal,
      billDiscountPercent: params.billDiscountPercent,
      billDiscountAmount: params.billDiscountAmount,
      taxPercent: params.taxPercent,
      taxAmount: params.taxAmount,
      grandTotal: params.grandTotal,
      payment: {
        ...params.payment,
        cashierName: settings.cashierName || 'Cashier'
      },
      status: 'completed',
      notes: params.notes,
      isDemo: false
    };

    // 6. Deduct Stock Atomically
    for (const item of params.cartItems) {
      const product = currentProducts.find(p => p.id === item.product.id);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
      }
    }

    // 7. Update Customer Metrics if customer attached
    if (params.customer) {
      const customers = this.getCustomers();
      const custIndex = customers.findIndex(c => c.id === params.customer?.id);
      if (custIndex >= 0) {
        customers[custIndex].totalSpent += params.grandTotal;
        customers[custIndex].totalVisits += 1;
        customers[custIndex].lastVisit = new Date().toISOString().split('T')[0];
        this.saveCustomers(customers);
      }
    }

    // 8. Commit Changes
    this.saveProducts(currentProducts);

    const invoices = this.getInvoices();
    invoices.unshift(newInvoice);
    this.saveInvoices(invoices);

    // Increment invoice sequence
    settings.nextInvoiceSequence += 1;
    this.saveSettings(settings);

    // Log Activity
    this.logActivity({
      type: 'sale',
      description: `Sale completed: ${invoiceNumber} (${lineItems.length} items)`,
      amount: params.grandTotal,
      user: settings.cashierName || 'Cashier'
    });

    return { success: true, invoice: newInvoice };
  }

  // Returns and Refunds Processing
  static processReturn(params: {
    invoiceId: string;
    itemsToReturn: {
      productId: string;
      quantity: number;
      condition: 'sellable' | 'damaged';
    }[];
    refundMethod: PaymentMethod;
    reason: string;
    cashierName?: string;
  }): { success: boolean; returnRecord?: ReturnRecord; error?: string } {
    const invoices = this.getInvoices();
    const invoice = invoices.find(i => i.id === params.invoiceId);
    if (!invoice) return { success: false, error: 'Original invoice not found.' };

    const returnDetails: ReturnItemDetail[] = [];
    let totalRefund = 0;
    const products = this.getProducts();

    for (const reqItem of params.itemsToReturn) {
      if (reqItem.quantity <= 0) continue;

      const lineItem = invoice.items.find(item => item.productId === reqItem.productId);
      if (!lineItem) return { success: false, error: `Item not found in invoice.` };

      const previouslyReturned = lineItem.returnedQuantity || 0;
      const maxReturnable = lineItem.quantity - previouslyReturned;

      if (reqItem.quantity > maxReturnable) {
        return {
          success: false,
          error: `Cannot return ${reqItem.quantity} units of "${lineItem.name}". Maximum returnable is ${maxReturnable}.`
        };
      }

      // Calculate unit refund
      const effectiveUnitPrice = lineItem.lineTotal / lineItem.quantity;
      const refundAmount = Number((effectiveUnitPrice * reqItem.quantity).toFixed(2));
      totalRefund += refundAmount;

      lineItem.returnedQuantity = previouslyReturned + reqItem.quantity;

      returnDetails.push({
        productId: reqItem.productId,
        quantity: reqItem.quantity,
        refundAmount,
        condition: reqItem.condition
      });

      // Restore stock only for sellable condition
      if (reqItem.condition === 'sellable') {
        const product = products.find(p => p.id === reqItem.productId);
        if (product) {
          product.stock += reqItem.quantity;
        }
      }
    }

    if (returnDetails.length === 0) {
      return { success: false, error: 'No items selected for return.' };
    }

    // Determine invoice status
    const allItemsReturned = invoice.items.every(item => (item.returnedQuantity || 0) >= item.quantity);
    invoice.status = allItemsReturned ? 'returned_full' : 'returned_partial';

    // Create Return Record
    const returnRecord: ReturnRecord = {
      id: `ret-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      timestamp: new Date().toISOString(),
      items: returnDetails,
      totalRefund: Number(totalRefund.toFixed(2)),
      refundMethod: params.refundMethod,
      reason: params.reason,
      cashierName: params.cashierName || 'Admin'
    };

    const returns = this.getReturns();
    returns.unshift(returnRecord);
    this.saveReturns(returns);
    this.saveInvoices(invoices);
    this.saveProducts(products);

    this.logActivity({
      type: 'return',
      description: `Return processed for ${invoice.invoiceNumber}: Refund ₹${totalRefund.toFixed(2)} (${params.reason})`,
      amount: totalRefund,
      user: params.cashierName || 'Admin'
    });

    return { success: true, returnRecord };
  }

  // Safe Demo Data Reset
  static resetToDemoData(): void {
    safeSet(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    safeSet(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    safeSet(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    safeSet(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    safeSet(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    safeSet(STORAGE_KEYS.RETURNS, []);
    safeSet(STORAGE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS);
    safeSet(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    safeSet(STORAGE_KEYS.HELD_BILLS, []);
    this.logActivity({
      type: 'stock_adjustment',
      description: 'System restored to factory demo state',
      user: 'Admin'
    });
  }
}
