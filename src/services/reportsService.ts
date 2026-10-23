// src/services/reportsService.ts
// Financial reporting, KPI calculations, category revenue, and store-local date boundaries

import { Product, Invoice, ReturnRecord, InventoryBatch } from '../types';

export interface DashboardMetrics {
  totalProducts: number;
  stockValue: number;
  retailValue: number;
  todaysSales: number;
  todaysGrossProfit: number;
  totalBillsToday: number;
  averageBillValue: number;
  lowStockCount: number;
  expiringCount: number;
  totalRevenue: number;
  netRevenue: number;
  totalRefunds: number;
  paymentBreakdown: {
    cash: number;
    upi: number;
    card: number;
    other: number;
  };
  categoryBreakdown: Record<string, { revenue: number; units: number }>;
  topSelling: Array<{ name: string; units: number; revenue: number; profit: number }>;
}

export class ReportsService {
  /**
   * Helper to format store-local date YYYY-MM-DD
   */
  static getStoreLocalDateString(date: Date = new Date(), timezone = 'Asia/Kolkata'): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Calculate comprehensive KPI summary for dashboard and reporting screens
   */
  static calculateDashboardMetrics(
    products: Product[],
    invoices: Invoice[],
    returns: ReturnRecord[] = [],
    batches: InventoryBatch[] = [],
    timezone = 'Asia/Kolkata'
  ): DashboardMetrics {
    const todayStr = this.getStoreLocalDateString(new Date(), timezone);

    // Filter valid invoices (exclude cancelled)
    const validInvoices = invoices.filter(inv => inv.status !== 'cancelled');

    // Invoices for today
    const todaysInvoices = validInvoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return this.getStoreLocalDateString(invDate, timezone) === todayStr;
    });

    // Gross and Net sales today
    let todaysGrossSales = 0;
    let todaysGrossProfit = 0;

    todaysInvoices.forEach(inv => {
      todaysGrossSales += inv.grandTotal;

      let billItemCost = 0;
      inv.items.forEach(item => {
        const cost = item.purchasePrice * item.quantity;
        billItemCost += cost;
      });

      const lineProfits = inv.items.reduce((s, it) => s + (it.lineTotal - it.purchasePrice * it.quantity), 0);
      todaysGrossProfit += Math.max(0, lineProfits - (inv.billDiscountAmount || 0));
    });

    // Refunds today
    const todaysRefunds = returns
      .filter(ret => this.getStoreLocalDateString(new Date(ret.timestamp), timezone) === todayStr)
      .reduce((sum, ret) => sum + ret.totalRefund, 0);

    const todaysNetSales = Math.max(0, todaysGrossSales - todaysRefunds);

    // All time totals
    const totalGrossRevenue = validInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalRefundsAllTime = returns.reduce((sum, ret) => sum + ret.totalRefund, 0);
    const netRevenue = Math.max(0, totalGrossRevenue - totalRefundsAllTime);

    // Stock valuations
    const stockValue = products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0);
    const retailValue = products.reduce((sum, p) => sum + p.stock * p.sellingPrice, 0);

    // Alerts
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
    const expiringCount = batches.filter(b => b.status === 'expiring_soon' || b.status === 'expired').length;

    // Payment methods
    const paymentBreakdown = { cash: 0, upi: 0, card: 0, other: 0 };
    validInvoices.forEach(inv => {
      const method = (inv.payment.method || 'cash') as keyof typeof paymentBreakdown;
      if (paymentBreakdown[method] !== undefined) {
        paymentBreakdown[method] += inv.grandTotal;
      } else {
        paymentBreakdown.other += inv.grandTotal;
      }
    });

    // Category breakdown
    const categoryBreakdown: Record<string, { revenue: number; units: number }> = {};
    validInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const cat = item.category || 'General';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { revenue: 0, units: 0 };
        }
        categoryBreakdown[cat].revenue += item.lineTotal;
        categoryBreakdown[cat].units += item.quantity;
      });
    });

    // Top selling products
    const productSalesMap: Record<string, { name: string; units: number; revenue: number; profit: number }> = {};
    validInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.name,
            units: 0,
            revenue: 0,
            profit: 0
          };
        }
        productSalesMap[item.productId].units += item.quantity;
        productSalesMap[item.productId].revenue += item.lineTotal;
        productSalesMap[item.productId].profit += (item.lineTotal - item.purchasePrice * item.quantity);
      });
    });

    const topSelling = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalProducts: products.length,
      stockValue: Number(stockValue.toFixed(2)),
      retailValue: Number(retailValue.toFixed(2)),
      todaysSales: Number(todaysNetSales.toFixed(2)),
      todaysGrossProfit: Number(todaysGrossProfit.toFixed(2)),
      totalBillsToday: todaysInvoices.length,
      averageBillValue: todaysInvoices.length > 0 ? Number((todaysNetSales / todaysInvoices.length).toFixed(2)) : 0,
      lowStockCount,
      expiringCount,
      totalRevenue: Number(totalGrossRevenue.toFixed(2)),
      netRevenue: Number(netRevenue.toFixed(2)),
      totalRefunds: Number(totalRefundsAllTime.toFixed(2)),
      paymentBreakdown,
      categoryBreakdown,
      topSelling
    };
  }
}
