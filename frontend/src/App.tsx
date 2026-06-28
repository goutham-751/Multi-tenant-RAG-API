import React, { useEffect } from 'react'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboard } from './components/SuperAdminDashboard'
import { useTenantStore } from './store/useTenantStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { AnimatePresence, motion } from 'framer-motion'

const queryClient = new QueryClient()

function App() {
  const { tenantId, setTenant, clearTenant, sessionToken, isSuperadmin } = useTenantStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchTenantInfo(session.access_token, session.user.email === (import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@email.com'))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchTenantInfo(session.access_token, session.user.email === (import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@email.com'))
      } else {
        clearTenant()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchTenantInfo = async (token: string, isAdmin: boolean) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API_URL}/api/v1/tenants/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setTenant(data.tenant_id, token, null, data.name, isAdmin)
      } else {
        clearTenant()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-base font-sans text-text-primary antialiased">
        <AnimatePresence mode="wait">
          {!tenantId || !sessionToken ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <Onboarding onComplete={() => {}} />
            </motion.div>
          ) : isSuperadmin ? (
            <motion.div
              key="superadmin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SuperAdminDashboard />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </QueryClientProvider>
  )
}

export default App
