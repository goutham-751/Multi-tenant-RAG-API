import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Server, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        // Some users might need to confirm email depending on Supabase settings.
      }
      onComplete()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent-primary/5 blur-3xl pointer-events-none" />

      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-accent-primary/20 bg-accent-primary/10 px-3 py-1 text-sm font-medium text-accent-primary">
                RAG-as-a-Service
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-text-primary tracking-tight leading-[1.1]">
                Your data. <br/>
                Zero hallucinations. <br/>
                <span className="text-text-secondary">Ready in 60 seconds.</span>
              </h1>
              <p className="text-lg text-text-secondary max-w-md leading-relaxed">
                Upload your documents and get a private, isolated AI that only answers from your data. No infrastructure required.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <Feature icon={<Server size={20} />} title="Complete Isolation" desc="Your data never touches another tenant's vector space." />
              <Feature icon={<Zap size={20} />} title="Instant Cache" desc="Repeated queries return in <10ms with zero LLM cost." />
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto shadow-xl shadow-black/5 border-border-default/50 bg-white/60 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl">{isLogin ? 'Sign In' : 'Create Workspace'}</CardTitle>
              <CardDescription>
                {isLogin 
                  ? 'Access your isolated tenant environment.' 
                  : 'Enter your email and password to provision an environment.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Email</label>
                  <Input 
                    type="email"
                    placeholder="e.g. hello@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 bg-white"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Password</label>
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 bg-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium shadow-accent-primary/20 shadow-lg"
                  disabled={!email.trim() || !password.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Workspace'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border-default/50 pt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-accent-primary hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-border-default flex items-center justify-center text-text-primary shadow-sm">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-text-primary text-sm">{title}</h4>
        <p className="text-sm text-text-secondary mt-1">{desc}</p>
      </div>
    </div>
  )
}
