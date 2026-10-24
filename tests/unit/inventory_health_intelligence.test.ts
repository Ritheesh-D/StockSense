// tests/unit/inventory_health_intelligence.test.ts
import { describe, it, expect } from 'vitest';
import { HealthIntelligenceService } from '../../src/services/healthIntelligenceService';
import { parseAndValidateCsv, generateSampleCsv } from '../../src/utils/csvImportExport';
import { Product, Invoice } from '../../src/types';

describe('Phase 1 & 3: Inventory Health Intelligence Flagship Engine', () => {
  const dummyProducts: Product[] = [
    {
      id: 'p1',
      name: 'Organic Basmati Rice 1kg',
      category: 'Food & Grains',
      sku: 'SKU-001',
      barcode: '8901001',
      purchasePrice: 80,
      sellingPrice: 120,
      stock: 0, // Critical stockout
      minStock: 10,
      maxStock: 50,
      unit: 'kg',
      supplierId: 'sup-1'
    },
    {
      id: 'p2',
      name: 'Cold Pressed Coconut Oil 500ml',
      category: 'Condiments & Spices',
      sku: 'SKU-002',
      barcode: '8901002',
      purchasePrice: 150,
      sellingPrice: 220,
      stock: 120, // Overstocked (max is 40)
      minStock: 10,
      maxStock: 40,
      unit: 'bottle',
      supplierId: 'sup-1'
    },
    {
      id: 'p3',
      name: 'Whole Grain Oatmeal 500g',
      category: 'Food & Grains',
      sku: 'SKU-003',
      barcode: '8901003',
      purchasePrice: 60,
      sellingPrice: 95,
      stock: 25, // Balanced healthy
      minStock: 10,
      maxStock: 50,
      unit: 'pack',
      supplierId: 'sup-1'
    }
  ];

  it('detects critical stockout and assigns high risk score', () => {
    const analysis = HealthIntelligenceService.analyzeProduct(dummyProducts[0], []);
    expect(analysis.healthStatus).toBe('CRITICAL');
    expect(analysis.riskScore).toBeGreaterThanOrEqual(90);
    expect(analysis.quadrant).toBe('Critical');
  });

  it('detects overstocked items and calculates idle capital tied up', () => {
    const analysis = HealthIntelligenceService.analyzeProduct(dummyProducts[1], []);
    expect(analysis.healthStatus).toBe('OVERSTOCK');
    expect(analysis.quadrant).toBe('Overstocked');
    // 120 - 40 = 80 units * 150 purchase price = 12,000
    expect(analysis.capitalAtRisk).toBe(12000);
  });

  it('computes overall inventory health score (0-100) and portfolio breakdown', () => {
    const { metrics, analyses, recommendations } = HealthIntelligenceService.evaluateInventory(dummyProducts, []);
    expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
    expect(metrics.healthScore).toBeLessThanOrEqual(100);
    expect(analyses.length).toBe(3);
    expect(metrics.healthyPercent + metrics.overstockPercent + metrics.understockPercent + metrics.deadStockPercent + metrics.criticalPercent).toBeGreaterThanOrEqual(99);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('Phase 2: CSV Import & Validation Workflow', () => {
  it('generates a valid CSV sample with required headers', () => {
    const sample = generateSampleCsv();
    expect(sample).toContain('Product Name');
    expect(sample).toContain('Category');
    expect(sample).toContain('Current Stock');
    expect(sample).toContain('Minimum Stock');
    expect(sample).toContain('Maximum Stock');
    expect(sample).toContain('Unit Price');
    expect(sample).toContain('Supplier');
  });

  it('parses, validates, and flags duplicates and errors', () => {
    const csvContent = [
      'Product Name,Category,Current Stock,Minimum Stock,Maximum Stock,Unit Price,Supplier',
      'Fresh Almond Milk,Beverages,25,5,40,150.00,Pure Dairy',
      ',Beverages,10,5,30,50.00,Supplier B', // Missing name -> error
      'Bad Stock Item,Food & Grains,-5,5,30,80.00,Supplier C' // Negative stock -> error
    ].join('\n');

    const parsed = parseAndValidateCsv(csvContent, []);
    expect(parsed.length).toBe(3);
    expect(parsed[0].isValid).toBe(true);
    expect(parsed[0].productName).toBe('Fresh Almond Milk');
    expect(parsed[0].currentStock).toBe(25);

    // Row 2: missing name
    expect(parsed[1].isValid).toBe(false);
    expect(parsed[1].errors.some(e => e.includes('name'))).toBe(true);

    // Row 3: negative stock
    expect(parsed[2].isValid).toBe(false);
    expect(parsed[2].errors.some(e => e.includes('stock'))).toBe(true);
  });

  it('detects existing duplicate items against database catalog', () => {
    const existing = [
      {
        id: 'ex-1',
        name: 'Organic Basmati Rice 1kg',
        category: 'Food & Grains' as const,
        sku: 'SKU-001',
        barcode: '8901001',
        purchasePrice: 80,
        sellingPrice: 120,
        stock: 20,
        minStock: 10,
        unit: 'kg',
        supplierId: 'sup-1'
      }
    ];

    const csvContent = [
      'Product Name,Category,Current Stock,Minimum Stock,Maximum Stock,Unit Price,Supplier',
      'Organic Basmati Rice 1kg,Food & Grains,40,10,60,125.00,Nature Agro'
    ].join('\n');

    const parsed = parseAndValidateCsv(csvContent, existing);
    expect(parsed.length).toBe(1);
    expect(parsed[0].isDuplicate).toBe(true);
  });
});
