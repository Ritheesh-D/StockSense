export type ProductCategory = 
  | 'Food & Grains'
  | 'Beverages'
  | 'Snacks & Packaged'
  | 'Dairy & Bakery'
  | 'Personal Care'
  | 'Household Supplies'
  | 'Condiments & Spices';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  purchasePrice: number; // Cost price (for gross profit calculation)
  sellingPrice: number;  // Retail price
  stock: number;         // Current sellable stock
  minStock: number;      // Threshold for low stock warning
  unit: string;          // e.g. 'pcs', 'kg', 'pack'
  imageUrl?: string;
  supplierId: string;
  shelfLifeDays?: number;
  lastRestockedDate?: string;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  batchNo: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  purchaseDate: string;
  purchasePrice: number;
  status: 'normal' | 'expiring_soon' | 'expired';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalVisits: number;
  lastVisit?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountAmount: number; // Flat discount per unit or item total
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';
export type InvoiceStatus = 'completed' | 'returned_partial' | 'returned_full' | 'cancelled';

export interface InvoiceLineItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unitPrice: number;
  purchasePrice: number; // Stored for accurate gross profit tracking
  quantity: number;
  returnedQuantity?: number;
  discountAmount: number;
  lineTotal: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  amountPaid: number;
  changeGiven: number;
  transactionRef?: string;
  cashierName?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  createdAt: string; // ISO string
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  payment: PaymentDetails;
  status: InvoiceStatus;
  notes?: string;
  isDemo?: boolean;
}

export interface ReturnItemDetail {
  productId: string;
  quantity: number;
  refundAmount: number;
  condition: 'sellable' | 'damaged'; // Sellable items are restocked; damaged are written off
}

export interface ReturnRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  timestamp: string;
  items: ReturnItemDetail[];
  totalRefund: number;
  refundMethod: PaymentMethod;
  reason: string;
  cashierName?: string;
}

export interface HeldBill {
  id: string;
  heldAt: string;
  cartItems: CartItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  billDiscountPercent: number;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
  productCount: number;
  rating: number;
}

export type PurchaseOrderStatus = 'draft' | 'pending' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxRegistrationNumber: string; // GSTIN / VAT ID
  taxEnabled: boolean;
  defaultTaxPercent: number;
  taxLabel: string; // e.g. "GST (5%)"
  currencySymbol: string; // default ₹
  currencyCode: string;   // INR
  invoicePrefix: string;  // e.g. "INV-2026-"
  nextInvoiceSequence: number;
  receiptSize: '58mm' | '80mm' | 'a4';
  defaultPaymentMethod: PaymentMethod;
  cashierName: string;
  footerMessage: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'sale' | 'return' | 'stock_in' | 'stock_adjustment' | 'po_received';
  description: string;
  amount?: number;
  user: string;
}
