import React, { useState } from 'react';
import { Menu, Bell, PlusCircle, Store, Database, ShieldCheck, Mic, Sparkles } from 'lucide-react';
import { NavItem } from './Sidebar';
import { BackendStatusModal } from '../common/BackendStatusModal';
import { AuthService } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabaseClient';

interface HeaderProps {
  currentTab: NavItem;
  onOpenMobileNav: () => void;
  onGoToPOS: () => void;
  onOpenNotifications: () => void;
  onOpenVoiceAssistant?: () => void;
  lowStockCount: number;
  expiringCount: number;
  storeName: string;
  onRoleChanged?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileNav,
  onGoToPOS,
  onOpenNotifications,
  onOpenVoiceAssistant,
  lowStockCount,
  expiringCount,
  storeName,
  onRoleChanged
}) => {
  const [isBackendModalOpen, setIsBackendModalOpen] = useState(false);
  const titles: Record<NavItem, { title: string; subtitle: string }> = {
    overview: { title: 'Dashboard', subtitle: 'Inventory Health, Risk Matrix & Portfolio Intelligence' },
    billing: { title: 'Billing / POS', subtitle: 'Counter checkout & invoice generation' },
    sales_history: { title: 'Sales History', subtitle: 'All completed invoices, receipts & returns' },
    inventory: { title: 'Product Inventory', subtitle: 'Catalog, stock levels, CSV import & alerts' },
    forecast: { title: 'Inventory Intelligence', subtitle: 'Health gauge, risk matrix & reorder priorities' },
    recommendations: { title: 'AI Health Insights', subtitle: 'Autonomous stock optimization recommendations' },
    reorder: { title: 'Smart Reorder Recommendations', subtitle: 'Automated lead-time replenishment' },
    suppliers: { title: 'Suppliers', subtitle: 'Vendor contacts & catalog distribution' },
    purchase_orders: { title: 'Purchase Orders', subtitle: 'Restock orders & inventory receiving' },
    reports: { title: 'Business Analytics', subtitle: 'Revenue, profits, categories & margins' },
    settings: { title: 'Settings', subtitle: 'Store profile, tax, printing & hardware' },
  };

  const currentInfo = titles[currentTab] || { title: 'StockSense', subtitle: 'Retail Management' };
  const totalAlerts = lowStockCount + expiringCount;
  const configured = isSupabaseConfigured();
  const currentRole = AuthService.getCurrentRole();

  // Format today's date cleanly
  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        {/* Left: Mobile hamburger & breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {currentInfo.title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 font-medium">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions, Date, Alert Bell & Quick POS Sale */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Status & Role Button */}
          <button
            onClick={() => setIsBackendModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              configured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
            title="Click to inspect backend connection and switch user roles"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">
              {configured ? 'Supabase' : 'Offline'}
            </span>
            <span className="hidden md:inline px-1.5 py-0.2 text-[10px] uppercase font-bold rounded bg-white/80 border border-slate-200">
              {currentRole}
            </span>
          </button>

          {/* Date Display */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 font-mono">
            <span>{todayDateFormatted}</span>
          </div>

          {/* Store Identifier */}
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span className="truncate max-w-[150px] text-emerald-800">{storeName}</span>
          </div>

          {/* Quick New Sale button (if not already on billing) */}
          {currentTab !== 'billing' && (
            <button
              onClick={onGoToPOS}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">New Sale (POS)</span>
              <span className="sm:hidden">POS</span>
            </button>
          )}

          {/* AI Voice Assistant Quick Trigger */}
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
              title="Activate StockSense AI Voice Copilot"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          {/* Alert Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Stock & Expiry Alerts"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center font-mono animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Backend Diagnostics & Role Switcher Modal */}
      <BackendStatusModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        onRoleChanged={onRoleChanged}
      />
    </>
  );
};
