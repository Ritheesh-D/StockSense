import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavItem, Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { BottomNav, MobileTab } from './components/layout/BottomNav';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { BillingPOS } from './components/billing/BillingPOS';
import { SalesHistory } from './components/sales/SalesHistory';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { InventoryIntelligenceHub } from './components/analytics/InventoryIntelligenceHub';
import { RecommendationsView } from './components/recommendations/RecommendationsView';
import { SmartReorderPlanner } from './components/reorder/SmartReorderPlanner';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { PurchaseOrders } from './components/suppliers/PurchaseOrders';
import { BusinessReports } from './components/reports/BusinessReports';
import { SettingsView } from './components/settings/SettingsView';
import { NotificationsModal } from './components/common/NotificationsModal';
import { MobileAddProductModal } from './components/inventory/MobileAddProductModal';
import { StorageService } from './services/storageService';
import { ProductRepository } from './services/productRepository';
import { InventoryRepository } from './services/inventoryRepository';
import { SupplierRepository } from './services/supplierRepository';
import { SalesRepository } from './services/salesRepository';
import { ReturnsService } from './services/returnsService';
import { PurchaseOrderService } from './services/purchaseOrderService';
import { BillingService } from './services/billingService';
import { HealthIntelligenceService } from './services/healthIntelligenceService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { Product } from './types';

export default function App() {
  // Mobile-first default to 'overview' (Flagship Dashboard)
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

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
        if (Array.isArray(hbRes)) setHeldBills(hbRes);
      } catch (err) {
        console.warn('Backend sync failed, falling back to local storage cache', err);
      }
    } else {
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
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time metric counts for badges
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const expiringCount = batches.filter(b => b.status === 'expiring_soon' || b.status === 'expired').length;

  // Active AI Recommendations count for bottom nav badge
  const { recommendations } = useMemo(() => {
    return HealthIntelligenceService.calculateOverallMetrics(products, invoices, returns);
  }, [products, invoices, returns]);

  // Map NavItem to MobileTab
  const activeMobileTab: MobileTab = useMemo(() => {
    if (currentTab === 'inventory') return 'inventory';
    if (currentTab === 'forecast') return 'analytics';
    if (currentTab === 'recommendations') return 'recommendations';
    if (currentTab === 'settings') return 'settings';
    return 'dashboard';
  }, [currentTab]);

  const handleSelectMobileTab = (tab: MobileTab) => {
    switch (tab) {
      case 'dashboard':
        setCurrentTab('overview');
        break;
      case 'inventory':
        setCurrentTab('inventory');
        break;
      case 'analytics':
        setCurrentTab('forecast');
        break;
      case 'recommendations':
        setCurrentTab('recommendations');
        break;
      case 'settings':
        setCurrentTab('settings');
        break;
    }
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    const res = await ProductRepository.createProduct(productData as any);
    if (res.error) {
      throw new Error(res.error);
    }
    await refreshData();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      {/* Responsive Desktop & Mobile Drawer Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileNavOpen(false);
        }}
        heldBillsCount={heldBills.length}
        lowStockCount={lowStockCount}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        cashierName={settings.cashierName}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Modern Top Header */}
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

        {/* Dynamic Main Workspace View with bottom padding for mobile bar */}
        <main className="flex-1 overflow-y-auto bg-slate-50 pb-20 md:pb-6">
          {currentTab === 'overview' && (
            <OverviewDashboard
              products={products}
              invoices={invoices}
              returns={returns}
              suppliers={suppliers}
              batches={batches}
              settings={settings}
              onNavigate={setCurrentTab}
              onReorderProduct={() => setCurrentTab('reorder')}
              onImportProducts={async (newItems, summary) => {
                for (const item of newItems) {
                  await ProductRepository.createProduct(item as any);
                }
                await refreshData();
              }}
              onOpenAddProduct={() => setIsAddProductModalOpen(true)}
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
              suppliers={suppliers}
              onRefreshData={refreshData}
            />
          )}

          {currentTab === 'forecast' && (
            <InventoryIntelligenceHub
              products={products}
              invoices={invoices}
              returns={returns}
              settings={settings}
              onReorder={() => setCurrentTab('reorder')}
              onViewProduct={() => setCurrentTab('inventory')}
            />
          )}

          {currentTab === 'recommendations' && (
            <RecommendationsView
              products={products}
              invoices={invoices}
              returns={returns}
              settings={settings}
              onNavigateTab={setCurrentTab}
              onReorderProduct={() => setCurrentTab('reorder')}
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

        {/* Phase 6: Mobile Bottom Navigation Bar & Floating Action Button (+ Add Product) */}
        <BottomNav
          currentTab={activeMobileTab}
          onSelectTab={handleSelectMobileTab}
          onAddProduct={() => setIsAddProductModalOpen(true)}
          recommendationCount={recommendations.length}
        />
      </div>

      {/* Quick Add Product Modal triggered by FAB */}
      <MobileAddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        suppliers={suppliers}
        onAddProduct={handleAddProduct}
      />

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
