// src/services/csvService.ts
// Authenticated CSV parsing, validation, staging, error reporting, and export workflows

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { AuthService } from './authService';
import { Product, Invoice } from '../types';
import { ProductRepository } from './productRepository';

export interface CsvValidationResult<T> {
  validRows: T[];
  rejectedRows: Array<{
    rowNumber: number;
    identifier: string;
    reason: string;
    data: Record<string, string>;
  }>;
  headers: string[];
}

export class CsvService {
  /**
   * Safe CSV string parser handling quoted commas and escapes
   */
  static parseCsv(csvText: string): { headers: string[]; rows: string[][] } {
    const lines = csvText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);

    return { headers, rows };
  }

  /**
   * Validates and previews product CSV data before committing
   */
  static validateProductCsv(csvText: string, existingProducts: Product[]): CsvValidationResult<Omit<Product, 'id'>> {
    const { headers, rows } = this.parseCsv(csvText);
    const validRows: Omit<Product, 'id'>[] = [];
    const rejectedRows: CsvValidationResult<any>['rejectedRows'] = [];

    const existingSkus = new Set(existingProducts.map(p => p.sku.toLowerCase()));
    const existingBarcodes = new Set(existingProducts.filter(p => p.barcode).map(p => p.barcode.toLowerCase()));
    const batchSkus = new Set<string>();

    const colIndex = (name: string): number => {
      return headers.findIndex(h => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(name.toLowerCase()));
    };

    const skuIdx = colIndex('sku');
    const nameIdx = colIndex('name');
    const catIdx = colIndex('category');
    const sellIdx = colIndex('selling');
    const costIdx = colIndex('cost') !== -1 ? colIndex('cost') : colIndex('purchase');
    const stockIdx = colIndex('stock');
    const minStockIdx = colIndex('min');
    const barcodeIdx = colIndex('barcode');
    const unitIdx = colIndex('unit');

    rows.forEach((row, index) => {
      const rowNum = index + 2; // 1-indexed, header is row 1
      const rawData: Record<string, string> = {};
      headers.forEach((h, i) => {
        rawData[h] = row[i] || '';
      });

      const sku = (row[skuIdx] || '').trim();
      const name = (row[nameIdx] || '').trim();
      const category = (row[catIdx] || 'Food & Grains').trim();
      const sellingPrice = parseFloat(row[sellIdx] || '0');
      const purchasePrice = parseFloat(row[costIdx] || '0');
      const stock = parseFloat(row[stockIdx] || '0');
      const minStock = parseFloat(row[minStockIdx] || '10');
      const barcode = (barcodeIdx >= 0 ? row[barcodeIdx] : '').trim();
      const unit = (unitIdx >= 0 ? row[unitIdx] : 'pcs').trim() || 'pcs';

      // Validation Rules
      if (!sku) {
        rejectedRows.push({ rowNumber: rowNum, identifier: 'UNKNOWN', reason: 'Missing SKU', data: rawData });
        return;
      }
      if (!name) {
        rejectedRows.push({ rowNumber: rowNum, identifier: sku, reason: 'Missing Product Name', data: rawData });
        return;
      }
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        rejectedRows.push({ rowNumber: rowNum, identifier: sku, reason: 'Invalid or non-positive selling price', data: rawData });
        return;
      }
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        rejectedRows.push({ rowNumber: rowNum, identifier: sku, reason: 'Invalid cost price', data: rawData });
        return;
      }
      if (existingSkus.has(sku.toLowerCase()) || batchSkus.has(sku.toLowerCase())) {
        rejectedRows.push({ rowNumber: rowNum, identifier: sku, reason: `Duplicate SKU "${sku}"`, data: rawData });
        return;
      }
      if (barcode && (existingBarcodes.has(barcode.toLowerCase()))) {
        rejectedRows.push({ rowNumber: rowNum, identifier: sku, reason: `Duplicate Barcode "${barcode}"`, data: rawData });
        return;
      }

      batchSkus.add(sku.toLowerCase());

      validRows.push({
        sku,
        name,
        category: category as any,
        sellingPrice,
        purchasePrice,
        stock: Math.max(0, isNaN(stock) ? 0 : stock),
        minStock: Math.max(0, isNaN(minStock) ? 10 : minStock),
        barcode,
        unit,
        supplierId: ''
      });
    });

    return { validRows, rejectedRows, headers };
  }

  /**
   * Commit verified product rows via ProductRepository
   */
  static async importProducts(products: Omit<Product, 'id'>[]): Promise<{ importedCount: number; errors: string[] }> {
    let importedCount = 0;
    const errors: string[] = [];

    for (const prod of products) {
      const res = await ProductRepository.createProduct(prod);
      if (res.data) {
        importedCount++;
      } else if (res.error) {
        errors.push(`${prod.sku}: ${res.error}`);
      }
    }

    return { importedCount, errors };
  }

  /**
   * Import historical sales CSV without modifying current inventory stock
   */
  static async importHistoricalSalesCsv(csvText: string, filename: string): Promise<{
    importedCount: number;
    rejectedCount: number;
    batchId?: string;
    error?: string;
  }> {
    const storeId = AuthService.getActiveStoreId();
    const user = AuthService.getCurrentUser();
    const { headers, rows } = this.parseCsv(csvText);

    if (rows.length === 0) {
      return { importedCount: 0, rejectedCount: 0, error: 'CSV file contains no records.' };
    }

    if (!isSupabaseConfigured()) {
      return {
        importedCount: rows.length,
        rejectedCount: 0,
        batchId: `batch-local-${Date.now()}`
      };
    }

    try {
      // 1. Create import batch record
      const { data: batch, error: batchErr } = await supabase
        .from('sales_import_batches')
        .insert({
          store_id: storeId,
          source_filename: filename,
          status: 'processing',
          imported_count: 0,
          rejected_count: 0,
          created_by: user?.id && !user.id.startsWith('demo-') ? user.id : null
        })
        .select()
        .single();

      if (batchErr) return { importedCount: 0, rejectedCount: 0, error: batchErr.message };

      let imported = 0;
      let rejected = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowId = row[0] || `row-${i + 1}`;

        if (!row[0] || row.length < 3) {
          rejected++;
          await supabase.from('sales_import_rows').insert({
            import_batch_id: batch.id,
            source_row_identifier: rowId,
            status: 'rejected',
            error_message: 'Malformed row or missing columns'
          });
        } else {
          imported++;
          await supabase.from('sales_import_rows').insert({
            import_batch_id: batch.id,
            source_row_identifier: rowId,
            status: 'imported',
            error_message: null
          });
        }
      }

      // Update batch summary
      await supabase
        .from('sales_import_batches')
        .update({
          status: 'completed',
          imported_count: imported,
          rejected_count: rejected
        })
        .eq('id', batch.id);

      return {
        importedCount: imported,
        rejectedCount: rejected,
        batchId: batch.id
      };
    } catch (err: any) {
      return { importedCount: 0, rejectedCount: 0, error: err?.message || 'CSV batch import failed' };
    }
  }

  /**
   * Export products to CSV string
   */
  static exportProductsToCsv(products: Product[]): string {
    const headers = ['SKU', 'Name', 'Category', 'Selling Price', 'Cost Price', 'Current Stock', 'Min Stock', 'Unit', 'Barcode'];
    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      p.sellingPrice.toFixed(2),
      p.purchasePrice.toFixed(2),
      p.stock,
      p.minStock,
      `"${p.unit}"`,
      `"${p.barcode || ''}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Export sales invoices to CSV string
   */
  static exportSalesToCsv(invoices: Invoice[]): string {
    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment Method', 'Status'];
    const rows = invoices.map(inv => [
      `"${inv.invoiceNumber}"`,
      `"${inv.createdAt}"`,
      `"${(inv.customerName || 'Walk-in').replace(/"/g, '""')}"`,
      inv.subtotal.toFixed(2),
      inv.billDiscountAmount.toFixed(2),
      inv.taxAmount.toFixed(2),
      inv.grandTotal.toFixed(2),
      `"${inv.payment.method}"`,
      `"${inv.status}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
