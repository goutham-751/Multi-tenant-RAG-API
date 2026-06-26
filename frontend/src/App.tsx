import React, { useEffect } from 'react'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { SuperAdminDashboard } from './components/SuperAdminDashboard'
import { useTenantStore } from './store/useTenantStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'

const queryClient = new QueryClient()

function App() {
  const { tenantId, setTenant, clearTenant, sessionToken, isSuperadmin } = useTenantStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchTenantInfo(session.access_token, session.user.email === 'superadmin@email.com')
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchTenantInfo(session.access_token, session.user.email === 'superadmin@email.com')
      } else {
        clearTenant()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchTenantInfo = async (token: string, isAdmin: boolean) => {
    try {
      const res = await fetch('http://localhost:8001/api/v1/tenants/me', {
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
      <div className="min-h-screen bg-subtle font-sans text-text-primary antialiased">
        {!tenantId || !sessionToken ? (
          <Onboarding onComplete={() => {}} />
        ) : isSuperadmin ? (
          <SuperAdminDashboard />
        ) : (
          <Dashboard />
        )}
      </div>
    </QueryClientProvider>
  )
}

export default App
