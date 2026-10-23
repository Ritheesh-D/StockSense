// tests/unit/forecasting.test.ts
import { describe, it, expect } from 'vitest';
import { ForecastingService } from '../../src/services/forecastingService';
import { ReorderService } from '../../src/services/reorderService';
import { Product, Invoice, Supplier, PurchaseOrder, ReturnRecord } from '../../src/types';

describe('Forecasting & Reorder Calculation Engine', () => {
  const mockProducts: Product[] = [
    {
      id: 'p-1',
      sku: 'SKU-MAGGI',
      barcode: '8901058852301',
      name: 'Maggi Noodles',
      category: 'Food & Grains',
      purchasePrice: 10,
      sellingPrice: 15,
      stock: 20,
      minStock: 15,
      unit: 'pack',
      supplierId: 'sup-1',
      shelfLifeDays: 180
    },
    {
      id: 'p-2',
      sku: 'SKU-COKE',
      barcode: '8901764012224',
      name: 'Coca Cola',
      category: 'Beverages',
      purchasePrice: 20,
      sellingPrice: 30,
      stock: 0,
      minStock: 10,
      unit: 'bottle',
      supplierId: 'sup-2',
      shelfLifeDays: 90
    }
  ];

  const mockSuppliers: Supplier[] = [
    {
      id: 'sup-1',
      name: 'Fresh Foods',
      contactPerson: 'Manager',
      phone: '9876543210',
      email: 'sup@test.com',
      address: 'Market',
      leadTimeDays: 3,
      productCount: 1,
      rating: 4.8
    },
    {
      id: 'sup-2',
      name: 'Beverages Co',
      contactPerson: 'Lead',
      phone: '9876501234',
      email: 'bev@test.com',
      address: 'Logistics Park',
      leadTimeDays: 5,
      productCount: 1,
      rating: 4.5
    }
  ];

  it('calculates deterministic daily sales velocity and accounts for returned units', () => {
    const today = new Date().toISOString();
    const mockInvoices: Invoice[] = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        createdAt: today,
        items: [
          {
            productId: 'p-1',
            sku: 'SKU-MAGGI',
            barcode: '',
            name: 'Maggi',
            category: 'Food',
            unitPrice: 15,
            purchasePrice: 10,
            quantity: 28,
            returnedQuantity: 0,
            discountAmount: 0,
            lineTotal: 420
          }
        ],
        subtotal: 420,
        billDiscountPercent: 0,
        billDiscountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        grandTotal: 420,
        payment: { method: 'cash', amountPaid: 420, changeGiven: 0 },
        status: 'completed'
      }
    ];

    const mockReturns: ReturnRecord[] = [
      {
        id: 'ret-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        timestamp: today,
        items: [{ productId: 'p-1', quantity: 14, refundAmount: 210, condition: 'sellable' }],
        totalRefund: 210,
        refundMethod: 'cash',
        reason: 'Customer return'
      }
    ];

    // Net sold = 28 - 14 = 14 units across 14-day window => 1.0 unit/day
    const velocity = ForecastingService.calculateProductDailyVelocity('p-1', mockInvoices, mockReturns, 14);

    expect(velocity.isFallback).toBe(false);
    expect(velocity.totalSold).toBe(14);
    expect(velocity.avgDailySales).toBe(1.0);
  });

  it('uses documented fallback assumptions when product has no historical sales', () => {
    const velocity = ForecastingService.calculateProductDailyVelocity('p-unknown', [], [], 14);
    expect(velocity.isFallback).toBe(true);
    expect(velocity.totalSold).toBe(0);
    expect(velocity.avgDailySales).toBeGreaterThan(0);
  });

  it('assigns CRITICAL priority and orders safety buffer for out-of-stock items', () => {
    const recommendations = ReorderService.calculateRecommendations(
      mockProducts,
      [],
      mockSuppliers,
      []
    );

    const cokeRec = recommendations.find(r => r.productId === 'p-2');
    expect(cokeRec).toBeDefined();
    expect(cokeRec?.priority).toBe('CRITICAL');
    expect(cokeRec?.currentStock).toBe(0);
    expect(cokeRec?.recommendedOrder).toBeGreaterThan(0);
    // Verified rounding up to multiple of packSize 5
    expect(cokeRec!.recommendedOrder % 5).toBe(0);
  });

  it('deducts confirmed pending incoming purchase order stock from shortfall calculation', () => {
    const mockPOs: PurchaseOrder[] = [
      {
        id: 'po-1',
        orderNumber: 'PO-001',
        supplierId: 'sup-1',
        supplierName: 'Fresh Foods',
        orderDate: '2026-10-20',
        expectedDate: '2026-10-24',
        status: 'pending',
        items: [
          {
            productId: 'p-1',
            productName: 'Maggi',
            sku: 'SKU-MAGGI',
            quantity: 50,
            unitCost: 10,
            totalCost: 500
          }
        ],
        totalAmount: 500
      }
    ];

    const recWithPO = ReorderService.calculateRecommendations(
      mockProducts,
      [],
      mockSuppliers,
      mockPOs
    );

    const maggiRec = recWithPO.find(r => r.productId === 'p-1');
    expect(maggiRec?.pendingIncomingStock).toBe(50);
  });
});
