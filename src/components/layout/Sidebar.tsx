import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  History,
  Package,
  TrendingUp,
  RefreshCw,
  Truck,
  ClipboardList,
  BarChart3,
  Settings,
  Layers,
  X,
  UserCheck
} from 'lucide-react';

export type NavItem = 
  | 'overview'
  | 'billing'
  | 'sales_history'
  | 'inventory'
  | 'forecast'
  | 'reorder'
  | 'suppliers'
  | 'purchase_orders'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  heldBillsCount: number;
  lowStockCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  cashierName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  heldBillsCount,
  lowStockCount,
  isOpenMobile,
  onCloseMobile,
  cashierName = 'Admin'
}) => {
  const navItems: { id: NavItem; label: string; icon: React.ElementType; badge?: number | string; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing / POS', icon: Receipt, badge: heldBillsCount > 0 ? `${heldBillsCount} held` : undefined, badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
    { id: 'sales_history', label: 'Sales History', icon: History },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
    { id: 'forecast', label: 'Demand Forecast', icon: TrendingUp },
    { id: 'reorder', label: 'Smart Reorder Planner', icon: RefreshCw },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Lockup */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-md">
              <Layers className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-tight">StockSense</span>
              <span className="text-[11px] font-medium text-slate-400 block">Retail & POS Suite</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Cashier Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400 font-semibold text-xs shrink-0">
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{cashierName}</p>
              <p className="text-[11px] text-slate-400 truncate">Store Operator</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
