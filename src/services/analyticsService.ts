import { Product, Invoice, Supplier, PurchaseOrder, ReturnRecord } from '../types';

export interface ProductReorderRecommendation {
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
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  reason: string;
  predictedStockoutDate: string;
}

export class AnalyticsService {
  /**
   * Calculates the average daily sales for a product based on historical invoices
   * (takes last 14 days or minimum 1 day window). POS sales automatically increase this.
   */
  static getProductDailySales(productId: string, invoices: Invoice[], returns: ReturnRecord[] = []): number {
    // Collect sold quantities
    let totalUnitsSold = 0;
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Sum from completed invoices
    invoices.forEach(inv => {
      const invDate = new Date(inv.createdAt);
      if (inv.status !== 'cancelled' && invDate >= fourteenDaysAgo) {
        inv.items.forEach(item => {
          if (item.productId === productId) {
            const returned = item.returnedQuantity || 0;
            totalUnitsSold += Math.max(0, item.quantity - returned);
          }
        });
      }
    });

    // Provide baseline realistic velocity if data is fresh demo
    // Base heuristic per product ID if sales count is small
    const calculated = totalUnitsSold / 14;
    if (totalUnitsSold > 0) {
      return Number(Math.max(0.5, calculated).toFixed(1));
    }

    // Default baseline estimates from demo mockups
    const baselineMap: Record<string, number> = {
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

    return baselineMap[productId] || 1.0;
  }

  /**
   * Calculates Reorder Recommendations across all products
   */
  static getReorderRecommendations(
    products: Product[],
    invoices: Invoice[],
    suppliers: Supplier[],
    purchaseOrders: PurchaseOrder[],
    returns: ReturnRecord[] = []
  ): ProductReorderRecommendation[] {
    const today = new Date();

    return products.map(product => {
      const supplier = suppliers.find(s => s.id === product.supplierId);
      const leadTime = supplier?.leadTimeDays || 3;
      const supplierName = supplier?.name || 'Local Wholesale';

      // Pending stock from active purchase orders
      const pendingStock = purchaseOrders
        .filter(po => po.status === 'pending')
        .reduce((sum, po) => {
          const item = po.items.find(i => i.productId === product.id);
          return sum + (item ? item.quantity : 0);
        }, 0);

      const avgDailySales = this.getProductDailySales(product.id, invoices, returns);
      const daysOfCoverage = avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : 99;

      // Predicted stockout date
      const stockoutDateObj = new Date(today.getTime() + daysOfCoverage * 24 * 60 * 60 * 1000);
      const predictedStockoutDate = stockoutDateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // 30-day forecast demand
      const forecastDemand30d = Math.round(avgDailySales * 30);

      // Reorder formula:
      // Lead Time Demand = avgDailySales * leadTime
      // Safety Stock = Math.max(product.minStock, Math.ceil(avgDailySales * 3))
      // Total Target = Lead Time Demand + Safety Stock
      // Needed = Total Target - currentStock - pendingStock
      const leadTimeDemand = avgDailySales * leadTime;
      const safetyStock = Math.max(product.minStock, Math.ceil(avgDailySales * 3));
      const targetStock = leadTimeDemand + safetyStock;
      const netShortfall = targetStock - product.stock - pendingStock;

      let recommendedOrder = 0;
      let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';
      let reason = 'Stock levels healthy';

      if (product.stock === 0) {
        priority = 'CRITICAL';
        recommendedOrder = Math.ceil(Math.max(product.minStock * 2, targetStock));
        reason = 'Out of stock! Immediate order required';
      } else if (daysOfCoverage <= leadTime) {
        priority = 'CRITICAL';
        recommendedOrder = Math.ceil(Math.max(product.minStock * 2, targetStock * 1.5));
        reason = `Stockout predicted in ${daysOfCoverage} days (Lead time: ${leadTime} days)`;
      } else if (product.stock <= product.minStock) {
        priority = 'HIGH';
        recommendedOrder = Math.ceil(Math.max(product.minStock * 1.5, targetStock));
        reason = `Below minimum threshold (${product.stock} / ${product.minStock} units)`;
      } else if (daysOfCoverage <= leadTime * 2) {
        priority = 'MEDIUM';
        recommendedOrder = Math.ceil(Math.max(product.minStock, netShortfall > 0 ? netShortfall : 15));
        reason = `Lead-time coverage tight (${daysOfCoverage} days left)`;
      } else if (netShortfall > 0) {
        recommendedOrder = Math.ceil(netShortfall);
        reason = 'Demand growth + safety buffer replenishment';
      }

      // Round to neat pack multiples of 5 or 10 if recommendedOrder > 0
      if (recommendedOrder > 0) {
        recommendedOrder = Math.max(10, Math.ceil(recommendedOrder / 5) * 5);
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
        pendingIncomingStock: pendingStock,
        recommendedOrder,
        priority,
        reason,
        predictedStockoutDate
      };
    }).sort((a, b) => {
      // Sort critical first, then high, then medium, then by daysOfCoverage
      const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, NORMAL: 3 };
      if (rank[a.priority] !== rank[b.priority]) {
        return rank[a.priority] - rank[b.priority];
      }
      return a.daysOfCoverage - b.daysOfCoverage;
    });
  }

  /**
   * Summary Dashboard Metrics
   */
  static getDashboardSummary(products: Product[], invoices: Invoice[]) {
    // Total Products
    const totalProducts = products.length;

    // Stock Value (sum of stock * purchasePrice)
    const stockValue = products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0);

    // Today's Sales
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysInvoices = invoices.filter(inv => {
      if (inv.status === 'cancelled') return false;
      return inv.createdAt.startsWith(todayStr);
    });

    const todaysSales = todaysInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // Estimated Profit Today
    let todaysGrossProfit = 0;
    todaysInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const cost = item.purchasePrice * item.quantity;
        const revenue = item.lineTotal;
        todaysGrossProfit += (revenue - cost);
      });
      // Deduct bill level discount
      todaysGrossProfit -= (inv.billDiscountAmount || 0);
    });

    // Low stock count
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    // Total Revenue (all time completed)
    const validInvoices = invoices.filter(inv => inv.status !== 'cancelled');
    const totalRevenue = validInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    // Payment method breakdown
    const paymentBreakdown = {
      cash: 0,
      upi: 0,
      card: 0,
      other: 0
    };

    validInvoices.forEach(inv => {
      const method = inv.payment.method || 'cash';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + inv.grandTotal;
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
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return {
      totalProducts,
      stockValue,
      todaysSales,
      todaysGrossProfit: Math.max(0, todaysGrossProfit),
      lowStockCount,
      totalRevenue,
      paymentBreakdown,
      topSelling,
      totalBillsToday: todaysInvoices.length,
      averageBillValue: todaysInvoices.length > 0 ? todaysSales / todaysInvoices.length : 0
    };
  }
}
