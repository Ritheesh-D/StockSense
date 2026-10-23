import React, { useState, useEffect, useCallback } from 'react';
import { NavItem, Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { BillingPOS } from './components/billing/BillingPOS';
import { SalesHistory } from './components/sales/SalesHistory';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { DemandForecasting } from './components/forecast/DemandForecasting';
import { SmartReorderPlanner } from './components/reorder/SmartReorderPlanner';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { PurchaseOrders } from './components/suppliers/PurchaseOrders';
import { BusinessReports } from './components/reports/BusinessReports';
import { SettingsView } from './components/settings/SettingsView';
import { NotificationsModal } from './components/common/NotificationsModal';
import { StorageService } from './services/storageService';
import { ProductRepository } from './services/productRepository';
import { InventoryRepository } from './services/inventoryRepository';
import { SupplierRepository } from './services/supplierRepository';
import { SalesRepository } from './services/salesRepository';
import { ReturnsService } from './services/returnsService';
import { PurchaseOrderService } from './services/purchaseOrderService';
import { BillingService } from './services/billingService';
import { isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavItem>('billing');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Core Data State
  const [products, setProducts] = useState(StorageService.getProducts());
  const [batches, setBatches] = useState(StorageService.getBatches());
  const [suppliers, setSuppliers] = useState(StorageService.getSuppliers());
  const [customers, setCustomers] = useState(StorageService.getCustomers());
  const [invoices, setInvoices] = useState(StorageService.getInvoices());
  const [returns, setReturns] = useState(StorageService.getReturns());
  const [purchaseOrders, setPurchaseOrders] = useState(StorageService.getPurchaseOrders());
  const [settings, setSettings] = useState(StorageService.getSettings());
  const [heldBills, setHeldBills] = useState(StorageService.getHeldBills());
  const [activityLogs, setActivityLogs] = useState(StorageService.getActivityLogs());

  // Reload data from backend repositories or local storage
  const refreshData = useCallback(async () => {
    if (isSupabaseConfigured()) {
      try {
        const [prodRes, batchRes, supRes, invRes, retRes, poRes, hbRes] = await Promise.all([
          ProductRepository.getProducts(),
          InventoryRepository.getBatches(),
          SupplierRepository.getSuppliers(),
          SalesRepository.getInvoices(),
          ReturnsService.getReturns(),
          PurchaseOrderService.getPurchaseOrders(),
          BillingService.getHeldBills()
        ]);

        if (prodRes.data && prodRes.data.length > 0) setProducts(prodRes.data);
        if (batchRes.data && batchRes.data.length > 0) setBatches(batchRes.data);
        if (supRes.data && supRes.data.length > 0) setSuppliers(supRes.data);
        if (invRes.data && invRes.data.length > 0) setInvoices(invRes.data);
        if (retRes.data) setReturns(retRes.data);
        if (poRes.data && poRes.data.length > 0) setPurchaseOrders(poRes.data);
        if (hbRes) setHeldBills(hbRes);

        setCustomers(StorageService.getCustomers());
        setSettings(StorageService.getSettings());
        setActivityLogs(StorageService.getActivityLogs());
        return;
      } catch (err) {
        console.warn('Backend refresh error, falling back to cached storage:', err);
      }
    }

    // Default or Local Storage fallback
    setProducts(StorageService.getProducts());
    setBatches(StorageService.getBatches());
    setSuppliers(StorageService.getSuppliers());
    setCustomers(StorageService.getCustomers());
    setInvoices(StorageService.getInvoices());
    setReturns(StorageService.getReturns());
    setPurchaseOrders(StorageService.getPurchaseOrders());
    setSettings(StorageService.getSettings());
    setHeldBills(StorageService.getHeldBills());
    setActivityLogs(StorageService.getActivityLogs());
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Listen to window storage events if multi-tab
  useEffect(() => {
    const handleStorageChange = () => refreshData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshData]);

  // Alert Counts
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const expiringCount = batches.filter(b => b.status === 'expiring_soon').length;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        heldBillsCount={heldBills.length}
        lowStockCount={lowStockCount}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        cashierName={settings.cashierName}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onGoToPOS={() => setCurrentTab('billing')}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          lowStockCount={lowStockCount}
          expiringCount={expiringCount}
          storeName={settings.storeName}
          onRoleChanged={refreshData}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'overview' && (
            <OverviewDashboard
              products={products}
              invoices={invoices}
              batches={batches}
              settings={settings}
              onNavigate={setCurrentTab}
            />
          )}

          {currentTab === 'billing' && (
            <BillingPOS
              products={products}
              settings={settings}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'sales_history' && (
            <SalesHistory
              settings={settings}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryManagement
              products={products}
              settings={settings}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'forecast' && (
            <DemandForecasting
              products={products}
              invoices={invoices}
              settings={settings}
            />
          )}

          {currentTab === 'reorder' && (
            <SmartReorderPlanner
              products={products}
              invoices={invoices}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              settings={settings}
              onNavigate={setCurrentTab}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'suppliers' && (
            <SupplierManagement
              suppliers={suppliers}
              products={products}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'purchase_orders' && (
            <PurchaseOrders
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              products={products}
              settings={settings}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'reports' && (
            <BusinessReports
              products={products}
              invoices={invoices}
              returns={returns}
              settings={settings}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onRefreshData={refreshData}
            />
          )}
        </main>
      </div>

      {/* Notifications & Live Alert Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        products={products}
        batches={batches}
        activityLogs={activityLogs}
        onNavigate={setCurrentTab}
      />
    </div>
  );
}
