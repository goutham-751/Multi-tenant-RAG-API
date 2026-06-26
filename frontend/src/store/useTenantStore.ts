import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TenantState {
  tenantId: string | null;
  sessionToken: string | null;
  apiKey: string | null;
  tenantName: string | null;
  isSuperadmin: boolean;
  setTenant: (id: string, token: string, key: string | null, name: string, isSuperadmin?: boolean) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: null,
      sessionToken: null,
      apiKey: null,
      tenantName: null,
      isSuperadmin: false,
      setTenant: (id, token, key, name, isSuperadmin = false) => set({ tenantId: id, sessionToken: token, apiKey: key, tenantName: name, isSuperadmin }),
      clearTenant: () => set({ tenantId: null, sessionToken: null, apiKey: null, tenantName: null, isSuperadmin: false }),
    }),
    {
      name: 'tenant-storage',
    }
  )
)
