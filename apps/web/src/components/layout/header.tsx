'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn, formatDate } from '@/lib/utils'
import { LiveDot } from '@/components/ui/primitives'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Agency Overview',
  '/clients': 'Clients',
  '/conversations': 'All Conversations',
  '/inventory': 'Inventory',
  '/orders': 'Orders',
  '/broadcasts': 'Broadcasts',
  '/analytics': 'Analytics',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

export default function Header({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  )?.[1] || 'AfriBot'

  const now = new Date().toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Africa/Lagos'
  })

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 flex-shrink-0">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[15px] font-semibold text-gray-900">{pageTitle}</h1>
          <span className="text-xs text-gray-400 hidden sm:block">{now} · Lagos</span>
        </div>
      </div>

      {children}

      {/* Search */}
      <div className="relative hidden md:block">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search clients, orders..."
          className="w-52 pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-400 focus:bg-white transition-all"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9 9L11.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <LiveDot />
        <span className="hidden sm:block">Live</span>
      </div>

      {/* Notifications */}
      <button className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1a5.5 5.5 0 00-5.5 5.5c0 2.2-.7 3.4-1.3 4H14.8c-.6-.6-1.3-1.8-1.3-4A5.5 5.5 0 008 1zM8 15a2 2 0 002-2H6a2 2 0 002 2z" fill="currentColor"/>
        </svg>
        <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
      </button>
    </header>
  )
}
