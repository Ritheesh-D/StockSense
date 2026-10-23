// tests/unit/returns_and_refunds.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnsService } from '../../src/services/returnsService';
import { StorageService } from '../../src/services/storageService';
import { AuthService } from '../../src/services/authService';
import { Invoice, Product } from '../../src/types';

describe('Returns & Refunds Processing', () => {
  const mockProduct: Product = {
    id: 'ret-p1',
    sku: 'RET-SKU',
    barcode: '9999999999999',
    name: 'Returnable Item',
    category: 'Snacks & Packaged',
    purchasePrice: 20,
    sellingPrice: 50,
    stock: 10,
    minStock: 2,
    unit: 'pack',
    supplierId: 'sup-1'
  };

  const mockInvoice: Invoice = {
    id: 'inv-to-return',
    invoiceNumber: 'INV-2026-9999',
    createdAt: new Date().toISOString(),
    items: [
      {
        productId: 'ret-p1',
        sku: 'RET-SKU',
        barcode: '9999999999999',
        name: 'Returnable Item',
        category: 'Snacks & Packaged',
        unitPrice: 50,
        purchasePrice: 20,
        quantity: 5,
        returnedQuantity: 0,
        discountAmount: 0,
        lineTotal: 250
      }
    ],
    subtotal: 250,
    billDiscountPercent: 0,
    billDiscountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    grandTotal: 250,
    payment: { method: 'cash', amountPaid: 250, changeGiven: 0 },
    status: 'completed'
  };

  beforeEach(() => {
    StorageService.saveProducts([mockProduct]);
    StorageService.saveInvoices([mockInvoice]);
    StorageService.saveReturns([]);
    AuthService.switchDemoRole('manager'); // Manager has permission to process returns
  });

  it('rejects returns when requesting more than the available returnable quantity', async () => {
    const result = await ReturnsService.processReturn({
      invoiceId: 'inv-to-return',
      itemsToReturn: [{ productId: 'ret-p1', quantity: 10, condition: 'sellable' }], // Only 5 purchased
      refundMethod: 'cash',
      reason: 'Defective'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum returnable');
  });

  it('restores stock for sellable returns and updates invoice status to returned_partial', async () => {
    const result = await ReturnsService.processReturn({
      invoiceId: 'inv-to-return',
      itemsToReturn: [{ productId: 'ret-p1', quantity: 2, condition: 'sellable' }],
      refundMethod: 'cash',
      reason: 'Wrong flavor'
    });

    expect(result.success).toBe(true);
    expect(result.returnRecord).toBeDefined();
    expect(result.returnRecord?.totalRefund).toBe(100); // 2 * 50

    // Stock was 10, returned 2 sellable => now 12
    const prods = StorageService.getProducts();
    const p = prods.find(item => item.id === 'ret-p1');
    expect(p?.stock).toBe(12);

    // Invoice status should now be returned_partial
    const invs = StorageService.getInvoices();
    const inv = invs.find(i => i.id === 'inv-to-return');
    expect(inv?.status).toBe('returned_partial');
  });

  it('does NOT restore stock for damaged items (written off)', async () => {
    // Reset product stock to 10
    mockProduct.stock = 10;
    StorageService.saveProducts([mockProduct]);

    const result = await ReturnsService.processReturn({
      invoiceId: 'inv-to-return',
      itemsToReturn: [{ productId: 'ret-p1', quantity: 2, condition: 'damaged' }],
      refundMethod: 'cash',
      reason: 'Damaged packaging'
    });

    expect(result.success).toBe(true);
    // Stock must stay 10 since damaged items cannot be restocked
    const prods = StorageService.getProducts();
    const p = prods.find(item => item.id === 'ret-p1');
    expect(p?.stock).toBe(10);
  });
});
