import React, { useState, useRef, useEffect } from 'react'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Send, StopCircle, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { useTenantStore } from '../store/useTenantStore'
import { motion, AnimatePresence } from 'framer-motion'

interface Source {
  doc_name: string;
  chunk_index: number;
  snippet: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
  latency_ms?: number;
  cached?: boolean;
  fallback?: boolean;
  isStreaming?: boolean;
}

export function Playground({ documentCount = 1 }: { documentCount?: number }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { sessionToken } = useTenantStore()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || documentCount === 0 || isGenerating) return
    
    const userMessage: Message = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)
    
    const aiMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'ai', content: '', isStreaming: true }])
    
    try {
      // In a real app with streaming, we would use fetch with ReadableStream.
      // The PRD mentions backend might need to be extended for SSE.
      // For now, we simulate streaming if the backend doesn't support SSE, or we just do a regular fetch and simulate token append for UX if it's a fast backend.
      // Using standard POST /api/v1/query as per backend PRD
      
      const res = await fetch('http://localhost:8001/api/v1/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({ question: userMessage.content })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch')
      }

      // Simulate token-by-token streaming for the demo
      const fullText = data.answer || ''
      let currentText = ''
      
      const updateMessage = (updates: Partial<Message>) => {
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[aiMessageIndex] = { ...newMessages[aiMessageIndex], ...updates }
          return newMessages
        })
      }

      // Fast typing effect
      for (let i = 0; i < fullText.length; i += 3) {
        currentText += fullText.substring(i, i + 3)
        updateMessage({ content: currentText })
        await new Promise(r => setTimeout(r, 10)) // small delay
      }

      updateMessage({
        content: fullText,
        isStreaming: false,
        sources: data.sources,
        latency_ms: data.latency_ms,
        cached: data.cached,
        fallback: data.fallback
      })
      
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[aiMessageIndex] = {
          role: 'ai',
          content: 'An error occurred while generating the response. Please try again.',
          isStreaming: false,
          fallback: true
        }
        return newMessages
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="flex flex-col h-[600px] max-h-[80vh] bg-base shadow-sm border-border-default overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-subtle">
        <h2 className="font-semibold text-text-primary">Playground</h2>
        <Badge variant="outline" className="text-text-secondary">Model: Llama 3.3</Badge>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-subtle flex items-center justify-center mb-4 text-text-secondary">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-medium text-text-primary">Ask a question</h3>
            <p className="text-text-secondary max-w-sm text-sm">
              Your answers will be generated using only your uploaded documents, complete with verifiable citations.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}
      </div>

      <div className="p-4 bg-base border-t border-border-default">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={documentCount === 0 || isGenerating}
            placeholder={documentCount === 0 ? "Upload a document first to start asking questions" : "Ask a question about your documents..."}
            className="pr-12 h-14 rounded-lg bg-subtle focus-visible:bg-base transition-colors text-base"
          />
          {isGenerating ? (
            <Button 
              type="button"
              variant="ghost" 
              size="icon" 
              className="absolute right-2 text-text-secondary hover:text-status-danger"
              onClick={() => setIsGenerating(false)}
            >
              <StopCircle size={20} />
            </Button>
          ) : (
            <Button 
              type="submit" 
              variant="ghost" 
              size="icon"
              disabled={!input.trim() || documentCount === 0}
              className="absolute right-2 text-accent-primary hover:bg-accent-primary hover:text-white"
            >
              <Send size={18} />
            </Button>
          )}
        </form>
      </div>
    </Card>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-5 py-4", 
        isUser 
          ? "bg-text-primary text-white rounded-tr-sm" 
          : "bg-subtle text-text-primary border border-border-default rounded-tl-sm"
      )}>
        <div className="font-semibold text-xs mb-1 opacity-70">
          {isUser ? "You" : "AI"}
        </div>
        <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && <span className="inline-block w-2 h-4 bg-text-primary ml-1 animate-pulse" />}
        </div>
        
        {!isUser && !message.isStreaming && (message.sources || message.latency_ms || message.cached) && (
          <div className="mt-4 pt-3 border-t border-border-default flex flex-col gap-3">
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              {message.cached && (
                <span className="flex items-center text-status-success font-medium">
                  <Zap size={14} className="mr-1" /> Instant (cached)
                </span>
              )}
              {message.latency_ms && (
                <span>Answered in {message.latency_ms}ms</span>
              )}
              {message.fallback && (
                <span className="text-status-warning flex items-center border border-status-warning px-2 py-0.5 rounded-full">
                  Fallback Response
                </span>
              )}
            </div>

            {message.sources && message.sources.length > 0 && (
              <div className="border border-border-default rounded-md bg-base overflow-hidden">
                <button 
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-text-primary bg-subtle hover:bg-border-default transition-colors"
                >
                  {sourcesExpanded ? <ChevronDown size={14} className="mr-1.5 text-text-secondary" /> : <ChevronRight size={14} className="mr-1.5 text-text-secondary" />}
                  Sources ({message.sources.length})
                </button>
                
                <AnimatePresence>
                  {sourcesExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 space-y-3 bg-base">
                        {message.sources.map((src, i) => (
                          <div key={i} className="text-xs">
                            <div className="font-medium text-text-primary mb-1 flex items-center">
                                <span className="bg-subtle border border-border-default px-1.5 rounded mr-2 text-[10px]">Chunk {src.chunk_index}</span>
                                {src.doc_name}
                            </div>
                            <div className="text-text-secondary italic border-l-2 border-border-default pl-2 py-0.5 mt-1 bg-subtle/30 rounded-r-sm">
                              "{src.snippet}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
