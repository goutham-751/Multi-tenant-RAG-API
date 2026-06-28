import { useState, useEffect } from 'react'
import { Users, LogOut, Database, Activity, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTenantStore } from '../store/useTenantStore'
import { CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { GlassCard } from './ui/GlassCard'
import { AnimatedCounter } from './ui/AnimatedCounter'
import { supabase } from '../lib/supabase'

interface TenantInfo {
  tenant_id: string;
  name: string;
  chroma_collection: string;
  queries_count: number;
  is_active: boolean;
  created_at: string;
}

export function SuperAdminDashboard() {
  const { sessionToken, clearTenant } = useTenantStore()
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearTenant()
  }

  useEffect(() => {
    const fetchAllTenants = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
        const res = await fetch(`${API_URL}/api/v1/tenants/all`, {
          headers: {
            'Authorization': `Bearer ${sessionToken}`
          }
        })
        if (!res.ok) {
          throw new Error('Failed to fetch tenants')
        }
        const data = await res.json()
        setTenants(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllTenants()
  }, [sessionToken])

  return (
    <div className="flex h-screen bg-base overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] glass-sidebar flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center">
              <Shield size={14} className="text-status-danger" />
            </div>
            <span className="font-semibold text-sm text-text-primary tracking-tight">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-white/[0.05] text-text-primary relative group">
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-status-danger rounded-r-full" />
            <Users size={18} className="mr-3 shrink-0 opacity-80" />
            All Tenants
          </button>
        </nav>

        <div className="p-3 border-t border-white/[0.04]">
          <Button variant="ghost" className="w-full justify-start text-text-secondary hover:text-status-danger text-sm h-9" onClick={handleSignOut}>
            <LogOut size={15} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-base relative">
        {/* Subtle bg glow */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[400px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.03) 0%, transparent 70%)',
          }}
        />

        <header className="h-14 glass border-b border-white/[0.04] flex items-center justify-between px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm text-text-primary">System Overview</span>
            <Badge variant="danger" className="text-[10px] uppercase tracking-wider">Admin</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative z-10">
          <div className="max-w-[1200px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                  Tenant Management
                </h1>
                <p className="text-text-secondary text-sm mt-1">Monitor all registered tenants and their API usage across the system.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <GlassCard className="p-6" disableTilt>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400"><Users size={18} /></div>
                    <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Total Tenants</div>
                  </div>
                  <AnimatedCounter value={tenants.length} className="text-3xl font-semibold text-text-primary" />
                </GlassCard>
                <GlassCard className="p-6" disableTilt>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20 text-green-400"><Activity size={18} /></div>
                    <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Total API Queries</div>
                  </div>
                  <AnimatedCounter value={tenants.reduce((acc, t) => acc + t.queries_count, 0)} className="text-3xl font-semibold text-text-primary" />
                </GlassCard>
                <GlassCard className="p-6" disableTilt>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400"><Database size={18} /></div>
                    <div className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Active Collections</div>
                  </div>
                  <AnimatedCounter value={tenants.filter(t => t.chroma_collection).length} className="text-3xl font-semibold text-text-primary" />
                </GlassCard>
              </div>

              <GlassCard className="overflow-hidden" disableTilt>
                <CardHeader className="bg-white/[0.02] border-b border-white/[0.06]">
                  <CardTitle>Registered Tenants</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="p-8 text-center text-text-secondary text-sm">Loading tenants...</div>
                  ) : error ? (
                    <div className="p-8 text-center text-status-danger text-sm">{error}</div>
                  ) : tenants.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary text-sm">No tenants found in the system.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-tertiary uppercase tracking-wider bg-white/[0.02] border-b border-white/[0.06]">
                          <tr>
                            <th className="px-6 py-3.5 font-medium">Email / Name</th>
                            <th className="px-6 py-3.5 font-medium">Tenant ID</th>
                            <th className="px-6 py-3.5 font-medium">Collection</th>
                            <th className="px-6 py-3.5 font-medium text-right">Queries</th>
                            <th className="px-6 py-3.5 font-medium">Status</th>
                            <th className="px-6 py-3.5 font-medium">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {tenants.map((tenant, i) => (
                            <motion.tr
                              key={tenant.tenant_id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.04 }}
                              className="hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="px-6 py-4 font-medium text-text-primary">
                                {tenant.name}
                              </td>
                              <td className="px-6 py-4 text-text-tertiary font-mono text-xs">
                                {tenant.tenant_id.substring(0, 8)}...
                              </td>
                              <td className="px-6 py-4 text-text-tertiary font-mono text-xs">
                                {tenant.chroma_collection}
                              </td>
                              <td className="px-6 py-4 text-text-primary font-medium text-right">
                                {tenant.queries_count.toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                {tenant.is_active ? (
                                  <Badge variant="success">Active</Badge>
                                ) : (
                                  <Badge variant="danger">Inactive</Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-text-tertiary whitespace-nowrap text-xs">
                                {new Date(tenant.created_at).toLocaleDateString()}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
