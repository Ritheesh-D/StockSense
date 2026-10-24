// src/services/healthIntelligenceService.ts
// Flagship Inventory Health Intelligence Engine for StockSense

import { Product, Invoice, ReturnRecord, ProductHealthAnalysis, InventoryHealthMetrics, SmartRecommendation, RiskQuadrant, HealthStatus } from '../types';
import { ForecastingService } from './forecastingService';

export class HealthIntelligenceService {
  /**
   * Analyzes an individual product against velocity and stock parameters
   */
  static analyzeProduct(
    product: Product,
    invoices: Invoice[],
    returns: ReturnRecord[] = []
  ): ProductHealthAnalysis {
    const velocityData = ForecastingService.calculateProductDailyVelocity(product.id, invoices, returns, 14);
    const velocity = velocityData.avgDailySales;
    const maxStock = product.maxStock || Math.max(product.minStock * 4, 40);
    const daysOfCoverage = velocity > 0 ? Math.floor(product.stock / velocity) : 999;

    let healthStatus: HealthStatus = 'HEALTHY';
    let riskScore = 15;
    let recommendation = 'Stock levels are optimal and velocity is balanced.';
    let capitalAtRisk = 0;

    // Detect health status & urgency
    if (product.stock === 0) {
      healthStatus = 'CRITICAL';
      riskScore = 98;
      recommendation = `Out of stock! Immediate emergency reorder required to prevent revenue loss.`;
      capitalAtRisk = product.sellingPrice * Math.round(velocity * 7);
    } else if (daysOfCoverage <= 3 && velocity > 0.5) {
      healthStatus = 'CRITICAL';
      riskScore = 90;
      recommendation = `High stockout risk! Reorder ${product.name} within ${daysOfCoverage} day${daysOfCoverage === 1 ? '' : 's'}.`;
      capitalAtRisk = product.sellingPrice * Math.round(velocity * (7 - daysOfCoverage));
    } else if (product.stock <= product.minStock) {
      healthStatus = 'UNDERSTOCK';
      riskScore = 75;
      recommendation = `Understocked (${product.stock} units left vs ${product.minStock} min threshold). Trigger replenishment.`;
    } else if (product.stock > maxStock && daysOfCoverage > 50) {
      healthStatus = 'OVERSTOCK';
      riskScore = 60;
      const overstockUnits = product.stock - maxStock;
      const overstockPercent = Math.round((overstockUnits / maxStock) * 100);
      capitalAtRisk = Number((overstockUnits * product.purchasePrice).toFixed(2));
      recommendation = `${product.name} is overstocked by ${overstockPercent}%. ₹${capitalAtRisk.toLocaleString()} tied up in idle inventory.`;
    } else if (velocity < 0.2 && daysOfCoverage > 60 && product.stock > 10) {
      healthStatus = 'DEAD_STOCK';
      riskScore = 55;
      capitalAtRisk = Number((product.stock * product.purchasePrice).toFixed(2));
      recommendation = `Dead stock risk. 0 sales velocity detected this month. Consider a 15% clearance promotion.`;
    } else if (velocity < 0.4 && daysOfCoverage > 40) {
      healthStatus = 'SLOW_MOVING';
      riskScore = 40;
      recommendation = `Low movement this month (${velocity} units/day). Monitor closely before placing new POs.`;
    }

    // Quadrant Classification for Risk Matrix
    // X-axis: Demand Velocity (Slow < 1.5, Fast >= 1.5)
    // Y-axis: Stock Level relative to minStock (Low <= minStock * 1.5, High > minStock * 1.5)
    let quadrant: RiskQuadrant = 'Balanced';
    const isHighVelocity = velocity >= 1.5;
    const isLowStock = product.stock <= product.minStock * 1.5;

    if (product.stock === 0 || (isHighVelocity && isLowStock)) {
      quadrant = 'Critical';
    } else if (!isHighVelocity && isLowStock) {
      quadrant = 'Low Stock';
    } else if (!isHighVelocity && !isLowStock) {
      quadrant = 'Overstocked';
    } else {
      quadrant = 'Balanced';
    }

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      currentStock: product.stock,
      minStock: product.minStock,
      maxStock,
      sellingPrice: product.sellingPrice,
      purchasePrice: product.purchasePrice,
      velocity,
      daysOfCoverage,
      healthStatus,
      riskScore,
      quadrant,
      recommendation,
      capitalAtRisk
    };
  }

  /**
   * Evaluates overall inventory health, aggregates category metrics, and generates smart recommendations
   */
  static evaluateInventory(
    products: Product[],
    invoices: Invoice[],
    returns: ReturnRecord[] = []
  ): {
    metrics: InventoryHealthMetrics;
    analyses: ProductHealthAnalysis[];
    recommendations: SmartRecommendation[];
  } {
    if (products.length === 0) {
      return {
        metrics: {
          healthScore: 100,
          grade: 'A+',
          healthyPercent: 100,
          overstockPercent: 0,
          understockPercent: 0,
          deadStockPercent: 0,
          criticalPercent: 0,
          totalProducts: 0,
          totalStockValue: 0,
          capitalTiedInOverstock: 0,
          immediateStockoutCount: 0,
          overstockedCount: 0,
          slowMovingCount: 0
        },
        analyses: [],
        recommendations: []
      };
    }

    const analyses = products.map(p => this.analyzeProduct(p, invoices, returns));

    let healthyCount = 0;
    let overstockCount = 0;
    let understockCount = 0;
    let deadStockCount = 0;
    let criticalCount = 0;
    let slowMovingCount = 0;
    let totalStockValue = 0;
    let capitalTiedInOverstock = 0;

    analyses.forEach(a => {
      totalStockValue += a.currentStock * a.purchasePrice;

      switch (a.healthStatus) {
        case 'CRITICAL':
          criticalCount++;
          break;
        case 'UNDERSTOCK':
          understockCount++;
          break;
        case 'OVERSTOCK':
          overstockCount++;
          capitalTiedInOverstock += a.capitalAtRisk || 0;
          break;
        case 'DEAD_STOCK':
          deadStockCount++;
          capitalTiedInOverstock += a.capitalAtRisk || 0;
          break;
        case 'SLOW_MOVING':
          slowMovingCount++;
          break;
        case 'HEALTHY':
        default:
          healthyCount++;
          break;
      }
    });

    const total = products.length;
    const criticalPercent = Math.round((criticalCount / total) * 100);
    const understockPercent = Math.round((understockCount / total) * 100);
    const overstockPercent = Math.round((overstockCount / total) * 100);
    const deadStockPercent = Math.round((deadStockCount / total) * 100);
    const healthyPercent = Math.max(0, 100 - (criticalPercent + understockPercent + overstockPercent + deadStockPercent));

    // Calculate authoritative Health Score (0 - 100)
    // Critical stockouts penalize by 2.0x, understock by 1.2x, overstock by 0.6x, dead stock by 0.8x
    const penalty = (criticalPercent * 2.0) + (understockPercent * 1.2) + (overstockPercent * 0.6) + (deadStockPercent * 0.8);
    const rawScore = Math.max(12, Math.min(100, Math.round(100 - penalty)));

    let grade: InventoryHealthMetrics['grade'] = 'A';
    if (rawScore >= 90) grade = 'A+';
    else if (rawScore >= 80) grade = 'A';
    else if (rawScore >= 70) grade = 'B';
    else if (rawScore >= 58) grade = 'C';
    else if (rawScore >= 45) grade = 'D';
    else grade = 'F';

    const metrics: InventoryHealthMetrics = {
      healthScore: rawScore,
      grade,
      healthyPercent,
      overstockPercent,
      understockPercent,
      deadStockPercent,
      criticalPercent,
      totalProducts: total,
      totalStockValue: Math.round(totalStockValue),
      capitalTiedInOverstock: Math.round(capitalTiedInOverstock),
      immediateStockoutCount: criticalCount,
      overstockedCount: overstockCount,
      slowMovingCount: slowMovingCount + deadStockCount
    };

    // Sort analyses by risk priority (highest risk first)
    analyses.sort((a, b) => b.riskScore - a.riskScore);

    // Generate Smart Recommendations
    const recommendations: SmartRecommendation[] = [];

    // 1. Critical stockout alert
    const criticalItem = analyses.find(a => a.healthStatus === 'CRITICAL');
    if (criticalItem) {
      recommendations.push({
        id: `rec-crit-${criticalItem.productId}`,
        title: 'Critical Stockout Alert',
        type: 'stockout_risk',
        severity: 'critical',
        productId: criticalItem.productId,
        productName: criticalItem.name,
        description: `${criticalItem.name} has ${criticalItem.currentStock} units remaining with a daily demand of ${criticalItem.velocity} units. Predicted stockout in ${criticalItem.daysOfCoverage} day(s).`,
        impactMetric: `Stockout in ${criticalItem.daysOfCoverage}d`,
        actionLabel: 'Reorder Now',
        actionType: 'reorder',
        daysLeft: criticalItem.daysOfCoverage
      });
    }

    // 2. High Overstock Capital Alert
    const overstockedItem = analyses.find(a => a.healthStatus === 'OVERSTOCK');
    if (overstockedItem) {
      recommendations.push({
        id: `rec-over-${overstockedItem.productId}`,
        title: 'Excess Capital in Overstock',
        type: 'overstock',
        severity: 'warning',
        productId: overstockedItem.productId,
        productName: overstockedItem.name,
        description: `${overstockedItem.name} is holding ${overstockedItem.currentStock} units (${overstockedItem.daysOfCoverage} days coverage). ₹${(overstockedItem.capitalAtRisk || 0).toLocaleString()} is locked in idle stock.`,
        impactMetric: `₹${(overstockedItem.capitalAtRisk || 0).toLocaleString()} tied up`,
        actionLabel: 'Run Promo Bundle',
        actionType: 'discount'
      });
    }

    // 3. Dead Stock Liquidation Tip
    const deadStockItem = analyses.find(a => a.healthStatus === 'DEAD_STOCK' || a.healthStatus === 'SLOW_MOVING');
    if (deadStockItem) {
      recommendations.push({
        id: `rec-dead-${deadStockItem.productId}`,
        title: 'Slow Movement Detection',
        type: 'slow_moving',
        severity: 'info',
        productId: deadStockItem.productId,
        productName: deadStockItem.name,
        description: `${deadStockItem.name} velocity has dropped to ${deadStockItem.velocity} units/day. Consider moving to high-visibility checkout shelf or bundling with top sellers.`,
        impactMetric: `${deadStockItem.velocity} units/day`,
        actionLabel: 'Review Item',
        actionType: 'review'
      });
    }

    // 4. Strategic Inventory Optimization Tip
    recommendations.push({
      id: 'rec-opt-01',
      title: 'Batch Reorder Optimization',
      type: 'optimization',
      severity: 'success',
      description: `Grouping replenishment for ${criticalCount + understockCount} low-stock items into a single purchase order will save supplier transit lead-time by an estimated 2 days.`,
      impactMetric: 'Save 2 Days Lead Time',
      actionLabel: 'Create Master PO',
      actionType: 'create_po'
    });

    return { metrics, analyses, recommendations };
  }

  // Alias for overall metrics calculation
  static calculateOverallMetrics = HealthIntelligenceService.evaluateInventory;
}
