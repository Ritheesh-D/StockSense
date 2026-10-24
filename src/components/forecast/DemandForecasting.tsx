// src/components/forecast/DemandForecasting.tsx
// Redesigned to replace old demand forecasting with the flagship Inventory Health Intelligence Suite
import React from 'react';
import { Product, Invoice, StoreSettings } from '../../types';
import { InventoryIntelligenceHub } from '../analytics/InventoryIntelligenceHub';

interface DemandForecastingProps {
  products: Product[];
  invoices: Invoice[];
  settings: StoreSettings;
}

export const DemandForecasting: React.FC<DemandForecastingProps> = ({
  products,
  invoices,
  settings
}) => {
  return (
    <InventoryIntelligenceHub
      products={products}
      invoices={invoices}
      settings={settings}
    />
  );
};
