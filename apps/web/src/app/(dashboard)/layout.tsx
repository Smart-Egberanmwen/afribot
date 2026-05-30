'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { useAuthStore } from '@/stores/auth.store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token } = useAuthStore()
  // Wait for Zustand to rehydrate from localStorage before checking token.
  // Without this, token is always null on the first render (SSR/hydration),
  // which causes an immediate redirect back to /login.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !token) router.replace('/login')
  }, [token, router, hydrated])

  // Show nothing until we know whether the user is authenticated
  if (!hydrated || !token) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
