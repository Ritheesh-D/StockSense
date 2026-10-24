// src/components/layout/BottomNav.tsx
import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Sparkles, 
  Settings, 
  Plus
} from 'lucide-react';

export type MobileTab = 'dashboard' | 'inventory' | 'analytics' | 'recommendations' | 'settings';

interface BottomNavProps {
  currentTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  onAddProduct: () => void;
  recommendationCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onAddProduct,
  recommendationCount = 0
}) => {
  const tabs = [
    {
      id: 'dashboard' as MobileTab,
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'inventory' as MobileTab,
      label: 'Inventory',
      icon: Package
    },
    {
      id: 'analytics' as MobileTab,
      label: 'Analytics',
      icon: BarChart3
    },
    {
      id: 'recommendations' as MobileTab,
      label: 'Insights',
      icon: Sparkles,
      badge: recommendationCount > 0 ? recommendationCount : undefined
    },
    {
      id: 'settings' as MobileTab,
      label: 'Settings',
      icon: Settings
    }
  ];

  return (
    <>
      {/* Floating Action Button (FAB) - Mobile Native Feel */}
      <div className="fixed bottom-20 right-5 z-40 sm:bottom-22 sm:right-8">
        <button
          type="button"
          onClick={onAddProduct}
          aria-label="Add Product"
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 transition-all duration-200 focus:outline-hidden focus:ring-4 focus:ring-blue-300"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
          <span className="sr-only">Add Product</span>
          {/* Subtle pulse ring */}
          <span className="absolute -inset-1 rounded-full bg-blue-400/20 animate-ping -z-10 pointer-events-none" />
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 transition-all select-none"
        aria-label="Mobile Navigation"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[62px] cursor-pointer touch-manipulation ${
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 rounded-full bg-blue-600 shadow-xs animate-fade-in" />
                )}

                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                    }`}
                  />
                  {tab.badge && (
                    <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] mt-1 tracking-tight transition-colors ${
                    isActive ? 'font-bold text-blue-600' : 'text-slate-500 font-medium'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
