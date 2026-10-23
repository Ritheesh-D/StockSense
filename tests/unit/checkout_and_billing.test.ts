// tests/unit/checkout_and_billing.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BillingService } from '../../src/services/billingService';
import { StorageService } from '../../src/services/storageService';
import { CartItem, Product } from '../../src/types';

describe('Atomic Checkout & POS Billing Operations', () => {
  const testProduct: Product = {
    id: 'test-p1',
    sku: 'TEST-SKU-01',
    barcode: '1234567890123',
    name: 'Test Product 1',
    category: 'Food & Grains',
    purchasePrice: 50,
    sellingPrice: 100,
    stock: 10,
    minStock: 2,
    unit: 'pcs',
    supplierId: 'sup-1'
  };

  beforeEach(() => {
    StorageService.saveProducts([testProduct]);
  });

  it('rejects checkout when cart is empty', async () => {
    const result = await BillingService.checkoutSale({
      cartItems: [],
      subtotal: 0,
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 0,
      payment: { method: 'cash', amountPaid: 0, changeGiven: 0 }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects checkout when requested quantity exceeds available stock', async () => {
    const excessiveCart: CartItem[] = [
      {
        product: testProduct,
        quantity: 15, // Stock is only 10
        unitPrice: 100,
        discountAmount: 0,
        lineTotal: 1500
      }
    ];

    const result = await BillingService.checkoutSale({
      cartItems: excessiveCart,
      subtotal: 1500,
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 1500,
      payment: { method: 'cash', amountPaid: 1500, changeGiven: 0 }
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');
  });

  it('rejects cash checkout when tendered cash is less than grand total', async () => {
    const validCart: CartItem[] = [
      {
        product: testProduct,
        quantity: 2,
        unitPrice: 100,
        discountAmount: 0,
        lineTotal: 200
      }
    ];

    const result = await BillingService.checkoutSale({
      cartItems: validCart,
      subtotal: 200,
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal: 200,
      payment: { method: 'cash', amountPaid: 150, changeGiven: 0 } // Short by 50
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('less than total payable');
  });

  it('atomically deducts stock, produces invoice, and records payment on success', async () => {
    const validCart: CartItem[] = [
      {
        product: testProduct,
        quantity: 4,
        unitPrice: 100,
        discountAmount: 0,
        lineTotal: 400
      }
    ];

    const result = await BillingService.checkoutSale({
      cartItems: validCart,
      subtotal: 400,
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      taxPercent: 5,
      taxAmount: 20,
      grandTotal: 420,
      payment: { method: 'cash', amountPaid: 500, changeGiven: 80 }
    });

    expect(result.success).toBe(true);
    expect(result.invoice).toBeDefined();
    expect(result.invoice?.grandTotal).toBe(420);
    expect(result.invoice?.invoiceNumber).toMatch(/^INV-/);

    // Verify stock decremented exactly once: 10 - 4 = 6
    const updatedProducts = StorageService.getProducts();
    const prod = updatedProducts.find(p => p.id === 'test-p1');
    expect(prod?.stock).toBe(6);
  });
});
