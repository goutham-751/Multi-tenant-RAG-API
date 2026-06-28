import React, { useState, useRef, useEffect } from 'react'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Send, StopCircle, ChevronDown, ChevronRight, Zap, Sparkles } from 'lucide-react'
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

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'
      const res = await fetch(`${API_URL}/api/v1/query`, {
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

      const fullText = data.answer || ''
      let currentText = ''

      const updateMessage = (updates: Partial<Message>) => {
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[aiMessageIndex] = { ...newMessages[aiMessageIndex], ...updates }
          return newMessages
        })
      }

      for (let i = 0; i < fullText.length; i += 3) {
        currentText += fullText.substring(i, i + 3)
        updateMessage({ content: currentText })
        await new Promise(r => setTimeout(r, 10))
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
    <div className="flex flex-col h-[600px] max-h-[80vh] glass-card rounded-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-primary" />
          <h2 className="font-semibold text-sm text-text-primary">Playground</h2>
        </div>
        <Badge variant="outline" className="text-text-tertiary text-[11px]">Llama 3.3 · 70B</Badge>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-5"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-14 h-14 rounded-2xl bg-accent-muted flex items-center justify-center mb-2"
            >
              <Sparkles size={24} className="text-accent-primary" />
            </motion.div>
            <h3 className="text-lg font-medium text-text-primary">Ask a question</h3>
            <p className="text-text-secondary max-w-sm text-sm leading-relaxed">
              Answers are generated using only your uploaded documents, with verifiable citations.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/[0.02] border-t border-white/[0.06]">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={documentCount === 0 || isGenerating}
            placeholder={documentCount === 0 ? "Upload a document first to start asking questions" : "Ask about your documents..."}
            className="pr-12 h-12 rounded-xl bg-white/[0.03] text-sm"
          />
          {isGenerating ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 text-text-tertiary hover:text-status-danger"
              onClick={() => setIsGenerating(false)}
            >
              <StopCircle size={18} />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              disabled={!input.trim() || documentCount === 0}
              className="absolute right-2 text-accent-primary hover:bg-accent-primary/10"
            >
              <Send size={16} />
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const [sourcesExpanded, setSourcesExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn(
        "max-w-[85%] rounded-2xl px-5 py-4",
        isUser
          ? "bg-gradient-to-br from-accent-primary to-accent-hover text-white rounded-tr-md shadow-lg shadow-accent-primary/10"
          : "glass-card rounded-tl-md"
      )}>
        <div className={cn("font-medium text-[11px] mb-1.5 uppercase tracking-wider", isUser ? "text-white/60" : "text-text-tertiary")}>
          {isUser ? "You" : "AI"}
        </div>
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="inline-flex gap-0.5 ml-1.5 align-middle">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent-primary"
                  style={{
                    animation: `typing-dot 1.4s infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </span>
          )}
        </div>

        {!isUser && !message.isStreaming && (message.sources || message.latency_ms || message.cached) && (
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-col gap-3">
            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              {message.cached && (
                <span className="flex items-center text-status-success font-medium">
                  <Zap size={13} className="mr-1" /> Cached
                </span>
              )}
              {message.latency_ms && (
                <span>{message.latency_ms}ms</span>
              )}
              {message.fallback && (
                <span className="text-status-warning flex items-center border border-status-warning/30 px-2 py-0.5 rounded-full">
                  Fallback
                </span>
              )}
            </div>

            {message.sources && message.sources.length > 0 && (
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => setSourcesExpanded(!sourcesExpanded)}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-text-secondary hover:bg-white/[0.03] transition-colors"
                >
                  {sourcesExpanded ? <ChevronDown size={14} className="mr-1.5 text-text-tertiary" /> : <ChevronRight size={14} className="mr-1.5 text-text-tertiary" />}
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
                      <div className="p-3 space-y-3">
                        {message.sources.map((src, i) => (
                          <div key={i} className="text-xs">
                            <div className="font-medium text-text-secondary mb-1 flex items-center">
                              <span className="bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded mr-2 text-[10px] text-text-tertiary">Chunk {src.chunk_index}</span>
                              {src.doc_name}
                            </div>
                            <div className="text-text-tertiary italic border-l-2 border-accent-primary/20 pl-2 py-0.5 mt-1">
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
    </motion.div>
  )
}
