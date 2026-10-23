// tests/unit/csv_and_reporting.test.ts
import { describe, it, expect } from 'vitest';
import { CsvService } from '../../src/services/csvService';
import { ReportsService } from '../../src/services/reportsService';
import { Product, Invoice } from '../../src/types';

describe('CSV Parser, Validation & Store-Local Reporting', () => {
  const existingProducts: Product[] = [
    {
      id: 'p1',
      sku: 'SKU-001',
      barcode: '1111111111111',
      name: 'Existing Prod',
      category: 'Food & Grains',
      purchasePrice: 10,
      sellingPrice: 20,
      stock: 5,
      minStock: 2,
      unit: 'pcs',
      supplierId: 'sup-1'
    }
  ];

  it('rejects rows with duplicate SKUs or missing required fields', () => {
    const csvContent = `SKU,Name,Category,Selling Price,Cost Price,Current Stock,Min Stock,Barcode,Unit
SKU-001,Duplicate SKU Item,Food & Grains,25,15,10,2,2222222222222,pcs
SKU-002,Valid Item,Beverages,30,20,15,5,3333333333333,bottle
,Item Without SKU,Food & Grains,10,5,10,2,4444444444444,pcs
SKU-003,Item Invalid Price,Food & Grains,-5,5,10,2,5555555555555,pcs`;

    const validation = CsvService.validateProductCsv(csvContent, existingProducts);

    expect(validation.validRows.length).toBe(1);
    expect(validation.validRows[0].sku).toBe('SKU-002');
    expect(validation.rejectedRows.length).toBe(3);

    const reasons = validation.rejectedRows.map(r => r.reason);
    expect(reasons.some(r => r.includes('Duplicate SKU'))).toBe(true);
    expect(reasons.some(r => r.includes('Missing SKU'))).toBe(true);
    expect(reasons.some(r => r.includes('non-positive selling price'))).toBe(true);
  });

  it('computes store-local date strings consistently regardless of UTC offsets', () => {
    // Testing Asia/Kolkata (+05:30) vs America/New_York (-05:00)
    const testDate = new Date('2026-10-23T23:30:00Z'); // 23:30 UTC is 2026-10-24 in IST
    const istDate = ReportsService.getStoreLocalDateString(testDate, 'Asia/Kolkata');
    const nycDate = ReportsService.getStoreLocalDateString(testDate, 'America/New_York');

    expect(istDate).toBe('2026-10-24');
    expect(nycDate).toBe('2026-10-23');
  });

  it('calculates dashboard net sales deducting returns made in the same period', () => {
    const today = new Date().toISOString();
    const invoices: Invoice[] = [
      {
        id: 'inv-rep-1',
        invoiceNumber: 'INV-REP-1',
        createdAt: today,
        items: [
          {
            productId: 'p1',
            sku: 'SKU-001',
            barcode: '',
            name: 'Item',
            category: 'Food & Grains',
            unitPrice: 20,
            purchasePrice: 10,
            quantity: 5,
            returnedQuantity: 0,
            discountAmount: 0,
            lineTotal: 100
          }
        ],
        subtotal: 100,
        billDiscountPercent: 0,
        billDiscountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        grandTotal: 100,
        payment: { method: 'cash', amountPaid: 100, changeGiven: 0 },
        status: 'completed'
      }
    ];

    const returns = [
      {
        id: 'ret-rep-1',
        invoiceId: 'inv-rep-1',
        invoiceNumber: 'INV-REP-1',
        timestamp: today,
        items: [{ productId: 'p1', quantity: 1, refundAmount: 20, condition: 'sellable' as const }],
        totalRefund: 20,
        refundMethod: 'cash' as const,
        reason: 'Overcharged'
      }
    ];

    const metrics = ReportsService.calculateDashboardMetrics(existingProducts, invoices, returns, []);

    // Gross was 100, return was 20 => Net is 80
    expect(metrics.todaysSales).toBe(80);
    expect(metrics.totalBillsToday).toBe(1);
  });
});
