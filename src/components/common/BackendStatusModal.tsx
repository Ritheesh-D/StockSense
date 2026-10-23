// src/components/common/BackendStatusModal.tsx
// Interactive backend diagnostics modal showing Supabase connection, RLS status, and Role Switcher

import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, X, Server, Key, UserCheck } from 'lucide-react';
import { testSupabaseConnection, ConnectionStatus, isSupabaseConfigured } from '../../services/supabaseClient';
import { AuthService, AuthUser } from '../../services/authService';
import { UserRole } from '../../types/database';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleChanged?: () => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({
  isOpen,
  onClose,
  onRoleChanged
}) => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(AuthService.getCurrentUser());

  const runTest = async () => {
    setTesting(true);
    const res = await testSupabaseConnection();
    setStatus(res);
    setTesting(false);
  };

  useEffect(() => {
    if (isOpen) {
      runTest();
      setCurrentUser(AuthService.getCurrentUser());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleSelect = (role: UserRole) => {
    const updated = AuthService.switchDemoRole(role);
    setCurrentUser(updated);
    if (onRoleChanged) onRoleChanged();
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">Supabase Backend & Security</h3>
              <p className="text-xs text-slate-400">PostgreSQL persistence, RLS & Multi-tenant roles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Connection Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            status?.isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : configured
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}>
            {status?.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                {status?.isConnected
                  ? 'Connected to Live Supabase PostgreSQL'
                  : configured
                  ? 'Supabase Configured (Connecting...)'
                  : 'Local Storage / Offline Safe Mode'}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {status?.isConnected
                  ? `Active connection verified in ${status.latencyMs}ms. RLS policies and atomic PostgreSQL transaction functions active.`
                  : configured
                  ? (status?.error || 'Checking backend connectivity...')
                  : 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not yet configured in .env. Operating in high-fidelity local mode.'}
              </p>
            </div>
          </div>

          {/* Configuration Inspector */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-sans font-medium">
                <Server className="w-3.5 h-3.5" /> Supabase URL:
              </span>
              <span className="font-semibold text-slate-800 truncate max-w-[220px]">
                {import.meta.env.VITE_SUPABASE_URL || 'Not Set (.env.example)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-sans font-medium">
                <Key className="w-3.5 h-3.5" /> Anon Public Key:
              </span>
              <span className="font-semibold text-slate-800">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? '•••••••••••• (Present)' : 'Not Set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5 font-sans font-medium">
                <Database className="w-3.5 h-3.5" /> Active Store ID:
              </span>
              <span className="text-slate-800 font-semibold">{AuthService.getActiveStoreId()}</span>
            </div>
          </div>

          {/* Role Switcher */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Current Authenticated Role (RLS Context)
            </label>
            <p className="text-xs text-slate-500">
              Select a role below to simulate and test role-based access controls across all screens:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['owner', 'manager', 'cashier'] as UserRole[]).map(r => {
                const isSelected = currentUser?.role === r;
                return (
                  <button
                    key={r}
                    onClick={() => handleRoleSelect(r)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <UserCheck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{r}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-500 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
              {currentUser?.role === 'owner' && '👑 Owner: Unrestricted access (settings, product delete, reports, returns, migrations).'}
              {currentUser?.role === 'manager' && '🛡️ Manager: Catalog CRUD, purchase order approvals, stock receipts, and returns.'}
              {currentUser?.role === 'cashier' && '💳 Cashier: POS checkout, cart operations, held bills, and receipts.'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Pinging Database...' : 'Test Connection'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
