import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'AfriBot — Sign In' }

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1009] via-[#111810] to-[#0a1009] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
