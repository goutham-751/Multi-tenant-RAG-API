import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Users, LogOut, Database, Activity } from 'lucide-react'
import { useTenantStore } from '../store/useTenantStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

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

  useEffect(() => {
    const fetchAllTenants = async () => {
      try {
        const res = await fetch('http://localhost:8001/api/v1/tenants/all', {
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
    <div className="flex h-screen bg-subtle overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] bg-base border-r border-border-default flex flex-col shrink-0">
        <div className="h-14 flex items-center px-6 border-b border-border-default">
          <span className="font-semibold text-text-primary tracking-tight">Super Admin</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md bg-subtle text-text-primary relative group">
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-status-danger rounded-r-full" />
            <Users size={18} className="mr-3 shrink-0" />
            All Tenants
          </button>
        </nav>
        
        <div className="p-4 border-t border-border-default">
          <Button variant="ghost" className="w-full justify-start text-text-secondary hover:text-status-danger" onClick={clearTenant}>
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-subtle">
        <header className="h-14 bg-base border-b border-border-default flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">System Overview</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-status-danger border-status-danger/30 bg-status-danger/10">Admin</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                Tenant Management
              </h1>
              <p className="text-text-secondary mt-1">Monitor all registered tenants and their API usage across the system.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <Card className="p-6 border-border-default shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20} /></div>
                  <div className="text-sm font-medium text-text-secondary">Total Tenants</div>
                </div>
                <div className="text-3xl font-semibold text-text-primary">{tenants.length}</div>
              </Card>
              <Card className="p-6 border-border-default shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><Activity size={20} /></div>
                  <div className="text-sm font-medium text-text-secondary">Total API Queries</div>
                </div>
                <div className="text-3xl font-semibold text-text-primary">
                  {tenants.reduce((acc, t) => acc + t.queries_count, 0)}
                </div>
              </Card>
              <Card className="p-6 border-border-default shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Database size={20} /></div>
                  <div className="text-sm font-medium text-text-secondary">Active Collections</div>
                </div>
                <div className="text-3xl font-semibold text-text-primary">
                  {tenants.filter(t => t.chroma_collection).length}
                </div>
              </Card>
            </div>

            <Card className="overflow-hidden bg-base shadow-sm border-border-default">
              <CardHeader className="bg-subtle border-b border-border-default">
                <CardTitle>Registered Tenants</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-text-secondary">Loading tenants...</div>
                ) : error ? (
                  <div className="p-8 text-center text-status-danger">{error}</div>
                ) : tenants.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">No tenants found in the system.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-text-secondary uppercase bg-subtle border-b border-border-default">
                        <tr>
                          <th className="px-6 py-4 font-medium">Email / Name</th>
                          <th className="px-6 py-4 font-medium">Tenant ID</th>
                          <th className="px-6 py-4 font-medium">Chroma Collection</th>
                          <th className="px-6 py-4 font-medium text-right">Queries</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                          <th className="px-6 py-4 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-default">
                        {tenants.map((tenant) => (
                          <tr key={tenant.tenant_id} className="hover:bg-subtle/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-text-primary">
                              {tenant.name}
                            </td>
                            <td className="px-6 py-4 text-text-secondary font-mono text-xs">
                              {tenant.tenant_id}
                            </td>
                            <td className="px-6 py-4 text-text-secondary font-mono text-xs">
                              {tenant.chroma_collection}
                            </td>
                            <td className="px-6 py-4 text-text-primary font-medium text-right">
                              {tenant.queries_count.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              {tenant.is_active ? (
                                <Badge variant="success" className="bg-status-success/10 text-status-success border-0">Active</Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-status-danger/10 text-status-danger border-0">Inactive</Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
                              {new Date(tenant.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
