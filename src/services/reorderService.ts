// src/services/reorderService.ts
// Reorder recommendations engine utilizing lead times, safety stocks, pending POs, and pack multiples

import { Product, Invoice, Supplier, PurchaseOrder, ReturnRecord } from '../types';
import { ForecastingService } from './forecastingService';

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  avgDailySales: number;
  daysOfCoverage: number;
  forecastDemand30d: number;
  supplierLeadTime: number;
  supplierName: string;
  pendingIncomingStock: number;
  recommendedOrder: number;
  packSize: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  reason: string;
  predictedStockoutDate: string;
}

export class ReorderService {
  /**
   * Deterministically calculates reorder plan across the catalog
   */
  static calculateRecommendations(
    products: Product[],
    invoices: Invoice[],
    suppliers: Supplier[],
    purchaseOrders: PurchaseOrder[],
    returns: ReturnRecord[] = []
  ): ReorderRecommendation[] {
    const today = new Date();

    return products.map(product => {
      const supplier = suppliers.find(s => s.id === product.supplierId);
      const leadTime = supplier?.leadTimeDays || 3;
      const supplierName = supplier?.name || 'Local Wholesale Partner';

      // Confirmed incoming stock from pending purchase orders
      const pendingIncomingStock = purchaseOrders
        .filter(po => po.status === 'pending' || po.status === 'partially_received')
        .reduce((sum, po) => {
          const item = po.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const velocity = ForecastingService.calculateProductDailyVelocity(product.id, invoices, returns, 14);
      const avgDailySales = velocity.avgDailySales;
      const daysOfCoverage = avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : 999;

      const stockoutTimestamp = today.getTime() + Math.min(daysOfCoverage, 365) * 86400000;
      const predictedStockoutDate = new Date(stockoutTimestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const forecastDemand30d = Math.round(avgDailySales * 30);

      // Reorder Formula:
      // Lead Time Demand = avgDailySales * leadTime
      // Safety Stock Buffer = Math.max(minStock, Math.ceil(avgDailySales * 3))
      // Total Target = Lead Time Demand + Safety Stock
      // Shortfall = Target - Current Stock - Pending Stock
      const leadTimeDemand = avgDailySales * leadTime;
      const safetyStock = Math.max(product.minStock, Math.ceil(avgDailySales * 3));
      const targetStock = Math.ceil(leadTimeDemand + safetyStock);
      const netShortfall = targetStock - product.stock - pendingIncomingStock;

      let recommendedOrder = 0;
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';
      let reason = 'Stock levels healthy';
      const packSize = 5;

      if (product.stock === 0) {
        priority = 'CRITICAL';
        recommendedOrder = Math.max(product.minStock * 2, targetStock);
        reason = 'Out of stock! Immediate order required to resume sales.';
      } else if (daysOfCoverage <= leadTime) {
        priority = 'CRITICAL';
        recommendedOrder = Math.max(product.minStock * 2, Math.ceil(targetStock * 1.5));
        reason = `Stockout predicted in ${daysOfCoverage} days (Lead time: ${leadTime} days). Critical risk.`;
      } else if (product.stock <= product.minStock) {
        priority = 'HIGH';
        recommendedOrder = Math.max(product.minStock * 1.5, targetStock);
        reason = `Below minimum threshold (${product.stock} on hand vs ${product.minStock} minimum).`;
      } else if (daysOfCoverage <= leadTime * 2) {
        priority = 'MEDIUM';
        recommendedOrder = Math.max(product.minStock, netShortfall > 0 ? netShortfall : 15);
        reason = `Lead-time coverage tight (${daysOfCoverage} days left). Replenish buffer.`;
      } else if (netShortfall > 0) {
        recommendedOrder = netShortfall;
        reason = 'Demand growth and safety buffer replenishment.';
      }

      // Round up to nearest standard pack size
      if (recommendedOrder > 0) {
        recommendedOrder = Math.max(10, Math.ceil(recommendedOrder / packSize) * packSize);
      }

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: product.stock,
        minStock: product.minStock,
        avgDailySales,
        daysOfCoverage,
        forecastDemand30d,
        supplierLeadTime: leadTime,
        supplierName,
        pendingIncomingStock,
        recommendedOrder,
        packSize,
        priority,
        reason,
        predictedStockoutDate
      };
    }).sort((a, b) => {
      const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, NORMAL: 3 };
      if (rank[a.priority] !== rank[b.priority]) {
        return rank[a.priority] - rank[b.priority];
      }
      return a.daysOfCoverage - b.daysOfCoverage;
    });
  }
}
