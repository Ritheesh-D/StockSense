// src/types/database.ts
// Database Entity & Schema Types matching Supabase PostgreSQL Schema

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface DatabaseProfile {
  user_id: string;
  display_name: string;
  created_at: string;
}

export interface DatabaseStore {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  billing_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

export interface DatabaseCategory {
  id: string;
  store_id: string;
  name: string;
  created_at: string;
}

export interface DatabaseSupplier {
  id: string;
  store_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lead_time_days: number;
  min_order_value: number;
  active: boolean;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProduct {
  id: string;
  store_id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string | null;
  supplier_id: string | null;
  unit: string;
  selling_price: number;
  cost_price: number;
  min_stock: number;
  shelf_life_days: number | null;
  active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInventoryBatch {
  id: string;
  store_id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string | null;
  quantity_on_hand: number;
  unit_cost: number;
  received_at: string;
}

export type MovementType = 
  | 'sale' 
  | 'return_restock' 
  | 'return_damage' 
  | 'po_receipt' 
  | 'adjustment_add' 
  | 'adjustment_sub' 
  | 'write_off';

export interface DatabaseInventoryMovement {
  id: string;
  store_id: string;
  product_id: string;
  batch_id: string | null;
  movement_type: MovementType;
  quantity_change: number;
  reference_type: string;
  reference_id: string | null;
  idempotency_key: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DatabaseCustomer {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export type InvoiceStatus = 'completed' | 'returned_partial' | 'returned_full' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'refunded' | 'pending';

export interface DatabaseInvoice {
  id: string;
  store_id: string;
  invoice_number: string;
  customer_id: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DatabaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  sku_snapshot: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_cost_snapshot: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
  returned_quantity: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface DatabasePayment {
  id: string;
  store_id: string;
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: number;
  change_given: number;
  status: string;
  provider_reference: string | null;
  idempotency_key: string | null;
  created_at: string;
}

export interface DatabaseReturn {
  id: string;
  store_id: string;
  invoice_id: string;
  reason: string;
  refund_amount: number;
  status: string;
  refund_method: PaymentMethod;
  processed_by: string | null;
  created_at: string;
}

export interface DatabaseReturnItem {
  id: string;
  return_id: string;
  invoice_item_id: string;
  product_id: string | null;
  quantity: number;
  restock_quantity: number;
  damaged_quantity: number;
  refund_amount: number;
}

export interface DatabaseSalesTransaction {
  id: string;
  store_id: string;
  product_id: string | null;
  invoice_id: string;
  transaction_type: 'sale' | 'return';
  quantity: number;
  unit_price: number;
  transaction_date: string;
}

export interface DatabaseHeldBill {
  id: string;
  store_id: string;
  bill_data: any;
  created_by: string | null;
  updated_at: string;
}

export type PurchaseOrderStatus = 'draft' | 'pending' | 'partially_received' | 'received' | 'cancelled';

export interface DatabasePurchaseOrder {
  id: string;
  store_id: string;
  supplier_id: string | null;
  order_number: string;
  status: PurchaseOrderStatus;
  expected_delivery_date: string | null;
  subtotal: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DatabasePurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
}

export interface DatabasePurchaseReceipt {
  id: string;
  store_id: string;
  purchase_order_id: string;
  received_by: string | null;
  received_at: string;
  idempotency_key: string | null;
}

export interface DatabasePurchaseReceiptItem {
  id: string;
  receipt_id: string;
  purchase_order_item_id: string;
  quantity_received: number;
  batch_id: string | null;
}

export interface DatabaseAuditLog {
  id: string;
  store_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}
