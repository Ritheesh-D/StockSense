// src/utils/csvImportExport.ts
import { Product, ProductCategory, Supplier } from '../types';

export interface CsvParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  productName: string;
  category: ProductCategory;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplier: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface CsvImportSummary {
  id: string;
  timestamp: string;
  fileName: string;
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
}

const VALID_CATEGORIES: ProductCategory[] = [
  'Food & Grains',
  'Beverages',
  'Snacks & Packaged',
  'Dairy & Bakery',
  'Personal Care',
  'Household Supplies',
  'Condiments & Spices'
];

/**
 * Generates sample CSV string for inventory products
 */
export function generateSampleCsv(): string {
  const headers = ['Product Name', 'Category', 'Current Stock', 'Minimum Stock', 'Maximum Stock', 'Unit Price', 'Supplier'];
  const sampleRows = [
    ['Organic Brown Basmati Rice 1kg', 'Food & Grains', '35', '10', '50', '140.00', 'Nature Agro Foods'],
    ['Almond Milk Unsweetened 1L', 'Beverages', '8', '15', '40', '180.00', 'Pure Dairy & Co.'],
    ['Whole Wheat Bread 400g', 'Dairy & Bakery', '24', '10', '30', '45.00', 'Fresh Bake Mills'],
    ['Roasted Salted Cashews 200g', 'Snacks & Packaged', '42', '10', '40', '299.00', 'Nut Delight Farms'],
    ['Extra Virgin Olive Oil 500ml', 'Condiments & Spices', '5', '8', '25', '650.00', 'Mediterranean Imports'],
    ['Herbal Face Cleanser 150ml', 'Personal Care', '60', '15', '45', '220.00', 'Aura Wellness Organics'],
    ['Eco Surface Cleaner 1L', 'Household Supplies', '12', '10', '30', '175.00', 'Green Clean Labs']
  ];

  return [headers.join(','), ...sampleRows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
}

/**
 * Downloads a string as a CSV file in browser
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports current inventory products to CSV
 */
export function exportProductsToCsv(products: Product[], suppliers: Supplier[] = []): void {
  const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
  const headers = ['Product Name', 'Category', 'Current Stock', 'Minimum Stock', 'Maximum Stock', 'Unit Price', 'Supplier'];

  const rows = products.map(p => {
    const supplierName = supplierMap.get(p.supplierId) || 'Primary Supplier';
    return [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.stock,
      p.minStock,
      p.maxStock || p.minStock * 4,
      p.sellingPrice.toFixed(2),
      `"${supplierName.replace(/"/g, '""')}"`
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCsvFile(`stocksense_inventory_export_${dateStr}.csv`, csv);
}

/**
 * Parse and validate CSV text against schema and existing products
 */
export function parseAndValidateCsv(
  csvText: string,
  existingProducts: Product[]
): CsvParsedRow[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

  const getColIndex = (names: string[]): number => {
    return headers.findIndex(h => names.some(n => h.includes(n.toLowerCase())));
  };

  const nameIdx = getColIndex(['product name', 'name', 'product']);
  const categoryIdx = getColIndex(['category']);
  const stockIdx = getColIndex(['current stock', 'stock', 'quantity', 'qty']);
  const minStockIdx = getColIndex(['minimum stock', 'min stock', 'min']);
  const maxStockIdx = getColIndex(['maximum stock', 'max stock', 'max']);
  const priceIdx = getColIndex(['unit price', 'selling price', 'price', 'mrp']);
  const supplierIdx = getColIndex(['supplier']);

  const existingNames = new Set(existingProducts.map(p => p.name.trim().toLowerCase()));
  const seenInCsv = new Set<string>();

  const results: CsvParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i]);
    if (rawCols.every(c => !c.trim())) continue;

    const rowNumber = i + 1;
    const errors: string[] = [];

    const productName = (nameIdx >= 0 ? rawCols[nameIdx] : rawCols[0] || '').trim();
    const rawCategory = (categoryIdx >= 0 ? rawCols[categoryIdx] : rawCols[1] || '').trim();
    const rawStock = (stockIdx >= 0 ? rawCols[stockIdx] : rawCols[2] || '').trim();
    const rawMinStock = (minStockIdx >= 0 ? rawCols[minStockIdx] : rawCols[3] || '').trim();
    const rawMaxStock = (maxStockIdx >= 0 ? rawCols[maxStockIdx] : rawCols[4] || '').trim();
    const rawPrice = (priceIdx >= 0 ? rawCols[priceIdx] : rawCols[5] || '').trim();
    const supplier = (supplierIdx >= 0 ? rawCols[supplierIdx] : rawCols[6] || 'General Supplier').trim();

    // Validation
    if (!productName) {
      errors.push('Product name is required');
    }

    const currentStock = Number(rawStock);
    if (isNaN(currentStock) || currentStock < 0) {
      errors.push('Current stock must be a non-negative number');
    }

    const minStock = Number(rawMinStock);
    if (isNaN(minStock) || minStock < 0) {
      errors.push('Minimum stock must be non-negative');
    }

    const maxStock = Number(rawMaxStock) || (minStock ? minStock * 4 : 50);
    if (maxStock < minStock) {
      errors.push('Max stock should be >= Min stock');
    }

    const unitPrice = Number(rawPrice);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      errors.push('Unit price must be greater than 0');
    }

    // Match or fallback category
    const matchedCategory = VALID_CATEGORIES.find(
      c => c.toLowerCase() === rawCategory.toLowerCase()
    ) || 'Food & Grains';

    // Duplicate detection
    const normalizedName = productName.toLowerCase();
    const isDuplicate = existingNames.has(normalizedName) || seenInCsv.has(normalizedName);
    if (normalizedName) {
      seenInCsv.add(normalizedName);
    }

    results.push({
      rowNumber,
      raw: {
        'Product Name': productName,
        'Category': matchedCategory,
        'Current Stock': rawStock,
        'Minimum Stock': rawMinStock,
        'Maximum Stock': rawMaxStock,
        'Unit Price': rawPrice,
        'Supplier': supplier
      },
      productName,
      category: matchedCategory,
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      minStock: isNaN(minStock) ? 5 : minStock,
      maxStock: isNaN(maxStock) ? 50 : maxStock,
      unitPrice: isNaN(unitPrice) ? 10 : unitPrice,
      supplier: supplier || 'General Supplier',
      isValid: errors.length === 0,
      isDuplicate,
      errors
    });
  }

  return results;
}

/**
 * Basic CSV line split supporting quoted commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
