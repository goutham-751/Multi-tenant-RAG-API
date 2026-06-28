import React, { useState, useEffect } from 'react'
import { LayoutDashboard, FileText, PlaySquare, Key, LogOut, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTenantStore } from '../store/useTenantStore'
import { Playground } from './Playground'
import { Documents } from './Documents'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { GlassCard } from './ui/GlassCard'
import { AnimatedCounter } from './ui/AnimatedCounter'
import { supabase } from '../lib/supabase'

export function Dashboard() {
  const { tenantName, sessionToken, apiKey, setTenant, clearTenant } = useTenantStore()
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'playground' | 'apikeys'>('playground')

  const [documents, setDocuments] = useState([])

  const fetchDocuments = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API_URL}/api/v1/documents`, {
        headers: { ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}) }
      })
      const data = await res.json()
      if (res.ok) {
        setDocuments(data.documents || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    clearTenant()
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
    { id: 'playground', label: 'Playground', icon: <PlaySquare size={18} /> },
    { id: 'apikeys', label: 'API Keys', icon: <Key size={18} /> },
  ]

  const isEmptyState = documents.length === 0

  return (
    <div className="flex h-screen bg-base overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[240px] glass-sidebar flex flex-col shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center">
              <Sparkles size={14} className="text-accent-primary" />
            </div>
            <span className="font-semibold text-sm text-text-primary tracking-tight">Ragnium RAG</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group
                ${activeTab === item.id
                  ? 'bg-white/[0.05] text-text-primary'
                  : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                }
              `}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent-primary rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="mr-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">{item.icon}</span>
              {item.label}
            </button>
          ))}
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
            background: 'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.04) 0%, transparent 70%)',
          }}
        />

        {/* Top bar */}
        <header className="h-14 glass border-b border-white/[0.04] flex items-center justify-between px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm text-text-primary">{tenantName}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Pro</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">Operational</Badge>
            <div className="w-8 h-8 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary flex items-center justify-center font-semibold text-xs">
              {tenantName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8 relative z-10">
          <div className="max-w-[1200px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {isEmptyState && activeTab === 'overview' ? (
                  <div className="mt-12 max-w-2xl mx-auto">
                    <GlassCard className="text-center p-12" disableTilt>
                      <div className="w-16 h-16 rounded-2xl bg-accent-muted mx-auto flex items-center justify-center mb-6">
                        <FileText size={28} className="text-accent-primary" />
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary mb-2">Upload your first document</h2>
                      <p className="text-text-secondary mb-8 max-w-md mx-auto text-sm">
                        Your knowledge base is empty. Upload a PDF, TXT, or MD file to start grounding your AI answers.
                      </p>

                      <div className="text-left bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 max-w-sm mx-auto space-y-3">
                        {['Upload a document', 'Ask a question in Playground', 'Copy API key'].map((step, i) => (
                          <div key={step} className="flex items-center text-sm font-medium text-text-secondary">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs ${i === 0 ? 'bg-accent-primary text-white' : 'bg-white/[0.06] text-text-tertiary'}`}>{i + 1}</div>
                            {step}
                          </div>
                        ))}
                      </div>

                      <Button variant="glow" className="mt-8 px-8 h-11" onClick={() => setActiveTab('documents')}>
                        Go to Documents
                      </Button>
                    </GlassCard>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h1 className="text-2xl font-semibold text-text-primary tracking-tight capitalize">
                        {activeTab === 'apikeys' ? 'API Keys & Integration' : activeTab}
                      </h1>
                      {activeTab === 'playground' && <p className="text-text-secondary text-sm mt-1">Test your RAG pipeline in real-time.</p>}
                      {activeTab === 'documents' && <p className="text-text-secondary text-sm mt-1">Manage the knowledge base grounding your AI.</p>}
                    </div>

                    {activeTab === 'playground' && <Playground documentCount={documents.length} />}

                    {activeTab === 'documents' && (
                      <Documents
                        documents={documents}
                        onUploadComplete={fetchDocuments}
                        onDelete={(name) => setDocuments(docs => docs.filter(d => (d as any).doc_name !== name))}
                      />
                    )}

                    {activeTab === 'apikeys' && (
                      <div className="space-y-6">
                        <GlassCard className="overflow-hidden" disableTilt>
                          <CardHeader className="bg-white/[0.02] border-b border-white/[0.06] flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Integration Snippets</CardTitle>
                              <CardDescription className="mt-1">Copy working code with your live API key.</CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isGeneratingKey}
                              onClick={async () => {
                                setIsGeneratingKey(true)
                                try {
                                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
                                  const res = await fetch(`${API_URL}/api/v1/tenants/me/api-key`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${sessionToken}` }
                                  })
                                  if (res.ok) {
                                    const data = await res.json()
                                    setTenant(useTenantStore.getState().tenantId!, sessionToken!, data.api_key, tenantName!)
                                  }
                                } finally {
                                  setIsGeneratingKey(false)
                                }
                              }}
                            >
                              {isGeneratingKey ? 'Generating...' : apiKey ? 'Regenerate API Key' : 'Generate API Key'}
                            </Button>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="bg-code-bg p-6 text-sm text-text-secondary font-mono overflow-x-auto">
                              <pre>
                                <code>
{`curl -X POST "${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "question": "What is our refund policy?"
  }'`}
                                </code>
                              </pre>
                            </div>
                          </CardContent>
                        </GlassCard>
                      </div>
                    )}

                    {activeTab === 'overview' && !isEmptyState && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <GlassCard className="p-6" disableTilt>
                            <div className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">Total Queries</div>
                            <AnimatedCounter value={1204} className="text-3xl font-semibold text-text-primary" />
                          </GlassCard>
                          <GlassCard className="p-6" disableTilt>
                            <div className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">Cache Hit Rate</div>
                            <AnimatedCounter value={38} className="text-3xl font-semibold text-text-primary" format={(n) => `${n}%`} />
                          </GlassCard>
                          <GlassCard className="p-6" disableTilt>
                            <div className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">Avg Latency</div>
                            <AnimatedCounter value={290} className="text-3xl font-semibold text-text-primary" format={(n) => `${n}ms`} />
                          </GlassCard>
                          <GlassCard className="p-6" disableTilt>
                            <div className="text-xs font-medium text-text-tertiary mb-2 uppercase tracking-wider">Docs Stored</div>
                            <AnimatedCounter value={documents.length} className="text-3xl font-semibold text-text-primary" />
                          </GlassCard>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
