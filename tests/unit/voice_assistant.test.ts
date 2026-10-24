// tests/unit/voice_assistant.test.ts
import { describe, it, expect, vi } from 'vitest';
import { VoiceAssistantService, VoiceServiceContext } from '../../src/services/voiceAssistantService';
import { Product, Invoice, StoreSettings } from '../../src/types';

describe('StockSense AI Voice Assistant Service (English ONLY)', () => {
  const dummyProducts: Product[] = [
    {
      id: 'p1',
      name: 'Organic Basmati Rice 1kg',
      category: 'Food & Grains',
      sku: 'SKU-001',
      barcode: '8901001',
      purchasePrice: 80,
      sellingPrice: 120,
      stock: 2, // low stock (min is 10)
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
      stock: 100, // overstock (max is 30)
      minStock: 5,
      maxStock: 30,
      unit: 'bottle',
      supplierId: 'sup-1'
    },
    {
      id: 'p3',
      name: 'Organic Sugar 1kg',
      category: 'Condiments & Spices',
      sku: 'SKU-003',
      barcode: '8901003',
      purchasePrice: 40,
      sellingPrice: 60,
      stock: 0, // critical out of stock
      minStock: 15,
      maxStock: 60,
      unit: 'pack',
      supplierId: 'sup-1'
    }
  ];

  const dummySettings: StoreSettings = {
    storeName: 'StockSense Demo Store',
    tagline: 'Modern Retail Intelligence',
    address: '123 Market St',
    phone: '555-0199',
    email: 'store@stocksense.ai',
    taxRegistrationNumber: 'GSTIN-123456',
    taxEnabled: true,
    defaultTaxPercent: 5,
    taxLabel: 'GST (5%)',
    currencySymbol: '₹',
    currencyCode: 'INR',
    invoicePrefix: 'INV-2026-',
    nextInvoiceSequence: 1001,
    receiptSize: '80mm',
    defaultPaymentMethod: 'cash',
    cashierName: 'Admin',
    footerMessage: 'Thank you for shopping!'
  };

  const createMockContext = (): VoiceServiceContext => ({
    products: dummyProducts,
    invoices: [],
    returns: [],
    settings: dummySettings,
    navigateTab: vi.fn(),
    openAddProduct: vi.fn(),
    openImportCsv: vi.fn(),
    exportCsv: vi.fn()
  });

  describe('Inventory Queries', () => {
    it('handles "Show low stock items" and identifies replenishment needs', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Show low stock items', ctx);
      expect(res.intent).toBe('low_stock');
      expect(res.spokenResponse).toMatch(/below minimum stock levels/i);
      expect(res.suggestedActions.length).toBeGreaterThan(0);
    });

    it('handles "How many products are critical?"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('How many products are critical?', ctx);
      expect(res.intent).toBe('critical_items');
      expect(res.spokenResponse).toMatch(/stockout risk|action recommended/i);
    });

    it('handles "Show overstock products" and calculates idle capital', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Show overstock products', ctx);
      expect(res.intent).toBe('overstock');
      expect(res.spokenResponse).toMatch(/overstocked/i);
      expect(res.spokenResponse).toMatch(/tied up in idle inventory/i);
    });

    it('generates a smart inventory summary for "What is today\'s inventory status?"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand("What is today's inventory status?", ctx);
      expect(res.intent).toBe('inventory_status');
      expect(res.spokenResponse).toMatch(/current inventory health is/i);
      expect(res.spokenResponse).toMatch(/action is recommended/i);
    });
  });

  describe('Analytics Queries', () => {
    it('handles "What is my inventory score?" and returns score and grade', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('What is my inventory score?', ctx);
      expect(res.intent).toBe('health_score');
      expect(res.spokenResponse).toMatch(/Inventory Health Score is \d+%/i);
      expect(res.spokenResponse).toMatch(/Grade/i);
    });

    it('handles "Which category has the highest stock?"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Which category has the highest stock?', ctx);
      expect(res.intent).toBe('highest_stock_category');
      expect(res.spokenResponse).toMatch(/highest stock volume/i);
    });

    it('handles "Show stock risk analysis"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Show stock risk analysis', ctx);
      expect(res.intent).toBe('risk_matrix');
      expect(res.spokenResponse).toMatch(/Stock risk analysis/i);
      expect(res.suggestedActions.some(a => a.label.includes('Risk Matrix'))).toBe(true);
    });
  });

  describe('Product Search Queries', () => {
    it('searches and details "Find product Rice"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Find product Rice', ctx);
      expect(res.intent).toBe('search_product');
      expect(res.spokenResponse).toMatch(/Found Organic Basmati Rice/i);
      expect(res.matchedProducts?.length).toBe(1);
    });

    it('searches for "Search for Oil"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Search for Oil', ctx);
      expect(res.intent).toBe('search_product');
      expect(res.spokenResponse).toMatch(/Cold Pressed Coconut Oil/i);
    });
  });

  describe('Management & Navigation Commands', () => {
    it('triggers openAddProduct for "Add a new product"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Add a new product', ctx);
      expect(res.intent).toBe('add_product');
      expect(ctx.openAddProduct).toHaveBeenCalled();
    });

    it('triggers navigateTab for "Open analytics"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Open analytics', ctx);
      expect(res.intent).toBe('open_analytics');
      expect(ctx.navigateTab).toHaveBeenCalledWith('forecast');
    });

    it('triggers navigateTab for "Open dashboard"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Open dashboard', ctx);
      expect(res.intent).toBe('open_dashboard');
      expect(ctx.navigateTab).toHaveBeenCalledWith('overview');
    });

    it('triggers navigateTab for "Open inventory section"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Open inventory section', ctx);
      expect(res.intent).toBe('open_inventory');
      expect(ctx.navigateTab).toHaveBeenCalledWith('inventory');
    });
  });

  describe('CSV Commands', () => {
    it('triggers openImportCsv for "Import inventory data"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Import inventory data', ctx);
      expect(res.intent).toBe('import_csv');
      expect(ctx.openImportCsv).toHaveBeenCalled();
    });

    it('triggers exportCsv for "Export inventory report"', () => {
      const ctx = createMockContext();
      const res = VoiceAssistantService.processCommand('Export inventory report', ctx);
      expect(res.intent).toBe('export_csv');
      expect(ctx.exportCsv).toHaveBeenCalled();
    });
  });
});
