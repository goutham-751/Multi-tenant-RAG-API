import React, { useState, useEffect } from 'react'
import { LayoutDashboard, FileText, PlaySquare, Key, BarChart3, LogOut } from 'lucide-react'
import { useTenantStore } from '../store/useTenantStore'
import { Playground } from './Playground'
import { Documents } from './Documents'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export function Dashboard() {
  const { tenantName, sessionToken, apiKey, setTenant, clearTenant } = useTenantStore()
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'playground' | 'apikeys'>('playground')
  
  const [documents, setDocuments] = useState([])
  
  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/v1/documents', {
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

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
    { id: 'playground', label: 'Playground', icon: <PlaySquare size={18} /> },
    { id: 'apikeys', label: 'API Keys', icon: <Key size={18} /> },
  ]

  // Empty State Override Check (PRD Section 5)
  const isEmptyState = documents.length === 0

  return (
    <div className="flex h-screen bg-subtle overflow-hidden font-sans">
      {/* Sidebar 240px */}
      <aside className="w-[240px] bg-base border-r border-border-default flex flex-col shrink-0">
        <div className="h-14 flex items-center px-6 border-b border-border-default">
          <span className="font-semibold text-text-primary tracking-tight">Trendverse RAG</span>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative group
                ${activeTab === item.id 
                  ? 'bg-subtle text-text-primary' 
                  : 'text-text-secondary hover:bg-subtle/50 hover:text-text-primary'
                }
              `}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-accent-primary rounded-r-full" />
              )}
              <span className="mr-3 shrink-0 opacity-80 group-hover:opacity-100">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border-default">
          <Button variant="ghost" className="w-full justify-start text-text-secondary hover:text-status-danger" onClick={clearTenant}>
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-subtle">
        {/* Top bar */}
        <header className="h-14 bg-base border-b border-border-default flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{tenantName}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-text-secondary bg-subtle">Pro</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="success">API Operational</Badge>
            <div className="w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center font-bold text-sm">
              {tenantName?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-[1200px] mx-auto">
            {isEmptyState && activeTab === 'overview' ? (
              <div className="mt-12 max-w-2xl mx-auto">
                <Card className="text-center p-12 shadow-sm border-border-default">
                  <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 mx-auto flex items-center justify-center mb-6">
                    <FileText size={32} className="text-accent-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Upload your first document</h2>
                  <p className="text-text-secondary mb-8 max-w-md mx-auto">
                    Your knowledge base is empty. Upload a PDF, TXT, or MD file to start grounding your AI answers.
                  </p>
                  
                  <div className="text-left bg-subtle border border-border-default rounded-lg p-6 max-w-sm mx-auto space-y-4">
                    <div className="flex items-center text-sm font-medium text-text-primary">
                      <div className="w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center mr-3 text-xs">1</div>
                      Upload a document
                    </div>
                    <div className="flex items-center text-sm font-medium text-text-secondary">
                      <div className="w-6 h-6 rounded-full bg-border-default flex items-center justify-center mr-3 text-xs">2</div>
                      Ask a question in Playground
                    </div>
                    <div className="flex items-center text-sm font-medium text-text-secondary">
                      <div className="w-6 h-6 rounded-full bg-border-default flex items-center justify-center mr-3 text-xs">3</div>
                      Copy API key
                    </div>
                  </div>
                  
                  <Button className="mt-8 px-8 h-12 text-base" onClick={() => setActiveTab('documents')}>
                    Go to Documents
                  </Button>
                </Card>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-text-primary tracking-tight capitalize">
                    {activeTab === 'apikeys' ? 'API Keys & Integration' : activeTab}
                  </h1>
                  {activeTab === 'playground' && <p className="text-text-secondary mt-1">Test your RAG pipeline in real-time.</p>}
                  {activeTab === 'documents' && <p className="text-text-secondary mt-1">Manage the knowledge base grounding your AI.</p>}
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
                    <Card className="overflow-hidden bg-base shadow-sm border-border-default">
                      <CardHeader className="bg-subtle border-b border-border-default flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Integration Snippets</CardTitle>
                          <CardDescription>Copy working code with your live API key.</CardDescription>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={isGeneratingKey}
                          onClick={async () => {
                            setIsGeneratingKey(true)
                            try {
                              const res = await fetch('http://localhost:8001/api/v1/tenants/me/api-key', {
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
                        <div className="bg-code-bg p-6 text-sm text-gray-300 font-mono overflow-x-auto">
                          <pre>
                            <code>
{`curl -X POST "http://localhost:8001/api/v1/query" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '{
    "question": "What is our refund policy?"
  }'`}
                            </code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {activeTab === 'overview' && !isEmptyState && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Placeholder stats as per Epic 5 */}
                      <Card className="p-6">
                        <div className="text-sm font-medium text-text-secondary mb-2">Total Queries</div>
                        <div className="text-3xl font-semibold text-text-primary">1,204</div>
                      </Card>
                      <Card className="p-6">
                        <div className="text-sm font-medium text-text-secondary mb-2">Cache Hit Rate</div>
                        <div className="text-3xl font-semibold text-text-primary">38%</div>
                      </Card>
                      <Card className="p-6">
                        <div className="text-sm font-medium text-text-secondary mb-2">Avg Latency</div>
                        <div className="text-3xl font-semibold text-text-primary">290ms</div>
                      </Card>
                      <Card className="p-6">
                        <div className="text-sm font-medium text-text-secondary mb-2">Docs Stored</div>
                        <div className="text-3xl font-semibold text-text-primary">{documents.length}</div>
                      </Card>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
