import { useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { AuroraBackground } from './ui/AuroraBackground'
import { GlassCard } from './ui/GlassCard'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Shield,
  Zap,
  Database,
  Search,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      setShowSuccess(true)
      setTimeout(() => onComplete(), 800)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { icon: <Zap size={18} />, label: 'Retrieval Latency', value: '<50ms', color: 'text-status-success' },
    { icon: <Database size={18} />, label: 'Knowledge Docs', value: '∞', color: 'text-accent-primary' },
    { icon: <Brain size={18} />, label: 'RAG Accuracy', value: '97.2%', color: 'text-accent-primary' },
    { icon: <Lock size={18} />, label: 'Encryption', value: 'AES-256', color: 'text-status-success' },
    { icon: <Search size={18} />, label: 'Vector Search', value: 'Hybrid', color: 'text-accent-primary' },
    { icon: <Shield size={18} />, label: 'Tenant Isolation', value: 'Complete', color: 'text-status-success' },
  ]

  return (
    <AuroraBackground>
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
        >
          {/* Left — Hero + Intelligence Panels */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10 hidden lg:block"
          >
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-muted px-3.5 py-1.5 text-xs font-medium text-accent-primary"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse-glow" />
                Enterprise RAG Platform
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-5xl xl:text-6xl font-bold text-text-primary tracking-tight leading-[1.08]"
              >
                Your data.
                <br />
                Zero hallucinations.
                <br />
                <span className="text-text-tertiary">Instant answers.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="text-base text-text-secondary max-w-md leading-relaxed"
              >
                Upload documents and get a private, tenant-isolated AI that only answers from your knowledge base. No infrastructure required.
              </motion.p>
            </div>

            {/* Intelligence Panels */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.4 }}
                >
                  <GlassCard className="p-4 cursor-default" disableTilt>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-secondary">
                        {f.icon}
                      </div>
                      <div>
                        <div className="text-xs text-text-tertiary">{f.label}</div>
                        <div className={`text-sm font-semibold ${f.color}`}>{f.value}</div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Auth Panel */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md mx-auto"
          >
            <div className="glass-strong rounded-2xl p-8 glow-subtle relative overflow-hidden">
              {/* Top glow */}
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-40 rounded-full pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                }}
              />

              <div className="relative z-10">
                {/* Logo + Title */}
                <div className="mb-8">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center mb-5">
                    <Brain size={20} className="text-accent-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold text-text-primary tracking-tight">
                    {isLogin ? 'Welcome back' : 'Create workspace'}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1.5">
                    {isLogin
                      ? 'Sign in to access your RAG environment.'
                      : 'Set up a new tenant to start querying.'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-5">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 p-3 rounded-lg"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      autoFocus
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        <motion.div
                          key={showPassword ? 'hide' : 'show'}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </motion.div>
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="glow"
                    className="w-full h-11 text-sm font-medium mt-2"
                    disabled={!email.trim() || !password.trim() || isSubmitting}
                  >
                    <AnimatePresence mode="wait">
                      {showSuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Check size={16} />
                          Authenticated
                        </motion.div>
                      ) : isSubmitting ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 size={16} className="animate-spin" />
                          Verifying...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                        >
                          {isLogin ? 'Sign In' : 'Create Workspace'}
                          <ArrowRight size={15} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </form>

                {/* Toggle */}
                <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(null) }}
                    className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
                  >
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <span className="text-accent-primary font-medium">
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subtle branding */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-center text-xs text-text-tertiary mt-6"
            >
              Powered by Ragnium RAG Engine
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </AuroraBackground>
  )
}
