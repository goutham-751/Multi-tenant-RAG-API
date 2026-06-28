import React from 'react'

export function AuroraBackground({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-base">
      {/* Aurora blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full animate-aurora-1"
        style={{
          top: '-20%',
          left: '-10%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-aurora-2"
        style={{
          top: '30%',
          right: '-15%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-aurora-3"
        style={{
          bottom: '-10%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Noise overlay */}
      <div className="absolute inset-0 noise-overlay" />

      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
}
