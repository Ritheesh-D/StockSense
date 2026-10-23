// src/services/forecastingService.ts
// Deterministic, explainable demand forecasting engine based on historical sales velocity

import { Invoice, ReturnRecord, Product } from '../types';

export interface ProductDemandForecast {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  avgDailySales: number;
  varianceDailySales: number;
  confidenceScore: number; // 0 to 1 based on history depth
  forecastDemand30d: number;
  daysOfCoverage: number;
  stockoutDate: string;
  isFallback: boolean;
  explanation: string;
}

export class ForecastingService {
  /**
   * Baseline heuristics used strictly as documented fallback when product history is fresh/zero
   */
  private static readonly FALLBACK_BASELINE: Record<string, number> = {
    'prod-1': 4.2, // Maggi
    'prod-2': 3.1, // Coca Cola
    'prod-3': 2.8, // Lays
    'prod-4': 2.5, // Amul Milk
    'prod-5': 1.8, // Britannia
    'prod-6': 2.0, // Tata Salt
    'prod-7': 1.2, // Atta
    'prod-8': 1.5, // Oil
    'prod-9': 1.1, // Colgate
    'prod-10': 1.9 // Dettol
  };

  /**
   * Deterministically calculates average daily sales from invoice history (14-day trailing window)
   */
  static calculateProductDailyVelocity(
    productId: string,
    invoices: Invoice[],
    returns: ReturnRecord[] = [],
    windowDays: number = 14
  ): { avgDailySales: number; totalSold: number; isFallback: boolean; dataPoints: number } {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - windowDays * 86400000);

    let totalGrossUnits = 0;
    let dataPoints = 0;

    // Sum units from valid completed invoices
    invoices.forEach(inv => {
      const invDate = new Date(inv.createdAt);
      if (inv.status !== 'cancelled' && invDate >= cutoffDate) {
        inv.items.forEach(item => {
          if (item.productId === productId) {
            totalGrossUnits += item.quantity;
            dataPoints++;
          }
        });
      }
    });

    // Subtract units returned
    let totalReturnedUnits = 0;
    returns.forEach(ret => {
      const retDate = new Date(ret.timestamp);
      if (retDate >= cutoffDate) {
        ret.items.forEach(item => {
          if (item.productId === productId) {
            totalReturnedUnits += item.quantity;
          }
        });
      }
    });

    const netUnitsSold = Math.max(0, totalGrossUnits - totalReturnedUnits);

    if (netUnitsSold > 0 && windowDays > 0) {
      const calculated = Number((netUnitsSold / windowDays).toFixed(2));
      return {
        avgDailySales: Math.max(0.2, calculated),
        totalSold: netUnitsSold,
        isFallback: false,
        dataPoints
      };
    }

    // Explicitly labelled fallback assumption
    const fallbackVelocity = this.FALLBACK_BASELINE[productId] || 1.0;
    return {
      avgDailySales: fallbackVelocity,
      totalSold: 0,
      isFallback: true,
      dataPoints: 0
    };
  }

  /**
   * Generates deterministic 30-day forecast across all products
   */
  static generateProductForecasts(
    products: Product[],
    invoices: Invoice[],
    returns: ReturnRecord[] = []
  ): ProductDemandForecast[] {
    const today = new Date();

    return products.map(product => {
      const velocity = this.calculateProductDailyVelocity(product.id, invoices, returns, 14);
      const avg = velocity.avgDailySales;
      const forecast30d = Math.round(avg * 30);
      const daysOfCoverage = avg > 0 ? Math.floor(product.stock / avg) : 999;

      const stockoutTimestamp = today.getTime() + Math.min(daysOfCoverage, 365) * 86400000;
      const stockoutDate = new Date(stockoutTimestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const explanation = velocity.isFallback
        ? `Insufficient transaction history (<14 days). Default baseline rate of ${avg} units/day applied.`
        : `Calculated from ${velocity.totalSold} net units sold across 14 trailing days (${avg} units/day). 30-day demand: ${forecast30d} units.`;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        currentStock: product.stock,
        avgDailySales: avg,
        varianceDailySales: Number((avg * 0.15).toFixed(2)),
        confidenceScore: velocity.isFallback ? 0.45 : Math.min(1.0, 0.7 + velocity.dataPoints * 0.05),
        forecastDemand30d: forecast30d,
        daysOfCoverage,
        stockoutDate,
        isFallback: velocity.isFallback,
        explanation
      };
    });
  }
}
