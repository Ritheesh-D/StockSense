// tests/unit/auth_and_rls.test.ts
import { describe, it, expect } from 'vitest';
import { AuthService } from '../../src/services/authService';

describe('Auth & Multi-Tenant Role Isolation', () => {
  it('stores and switches active store context', () => {
    const storeA = '00000000-0000-0000-0000-000000000001';
    const storeB = '00000000-0000-0000-0000-000000000002';

    AuthService.setActiveStoreId(storeA);
    expect(AuthService.getActiveStoreId()).toBe(storeA);

    AuthService.setActiveStoreId(storeB);
    expect(AuthService.getActiveStoreId()).toBe(storeB);
  });

  it('enforces role hierarchy and permissions for Owner, Manager, and Cashier', () => {
    // 1. Owner
    AuthService.switchDemoRole('owner');
    expect(AuthService.getCurrentRole()).toBe('owner');
    expect(AuthService.hasRole(['owner'])).toBe(true);
    expect(AuthService.hasRole(['owner', 'manager'])).toBe(true);

    // 2. Manager
    AuthService.switchDemoRole('manager');
    expect(AuthService.getCurrentRole()).toBe('manager');
    expect(AuthService.hasRole(['owner'])).toBe(false); // Manager cannot perform Owner-only tasks like delete
    expect(AuthService.hasRole(['owner', 'manager'])).toBe(true); // Manager can approve POs/returns

    // 3. Cashier
    AuthService.switchDemoRole('cashier');
    expect(AuthService.getCurrentRole()).toBe('cashier');
    expect(AuthService.hasRole(['owner', 'manager'])).toBe(false); // Cashier cannot approve refunds or manage suppliers
    expect(AuthService.hasRole(['cashier'])).toBe(true);
  });
});
