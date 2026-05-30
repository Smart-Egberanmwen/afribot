'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, initials, clientColor } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useTenants } from '@/hooks/use-api'

const AgencyNavItems = [
  { href: '/dashboard', icon: '⬡', label: 'Overview' },
  { href: '/clients', icon: '◈', label: 'Clients' },
  { href: '/conversations', icon: '◉', label: 'All Chats', badge: true },
  { href: '/inventory', icon: '▦', label: 'Inventory' },
  { href: '/orders', icon: '◳', label: 'Orders' },
  { href: '/broadcasts', icon: '◈', label: 'Broadcasts' },
  { href: '/analytics', icon: '▰', label: 'Analytics' },
  { href: '/billing', icon: '◈', label: 'Billing' },
  { href: '/settings', icon: '⚙', label: 'Settings' },
]

interface SidebarProps { className?: string }

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isAgencyAdmin } = useAuthStore()
  const [clientsOpen, setClientsOpen] = useState(true)
  const { data: tenantsData } = useTenants({ limit: 10 })
  const tenants = tenantsData?.data || []

  return (
    <aside className={cn(
      'flex flex-col w-56 bg-[#141810] text-white h-full border-r border-white/5',
      className
    )}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5C4.186 1.5 1.5 4.186 1.5 7.5S4.186 13.5 7.5 13.5 13.5 10.814 13.5 7.5 10.814 1.5 7.5 1.5zm0 2.4c.884 0 1.6.716 1.6 1.6S8.384 7.1 7.5 7.1 5.9 6.384 5.9 5.5 6.616 3.9 7.5 3.9zm0 7.2c-1.6 0-3.016-.816-3.84-2.056.02-1.216 2.04-1.944 3.84-1.944s3.82.728 3.84 1.944C11.316 10.284 9.9 11.1 7.5 11.1z" fill="white"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">AfriBot OS</div>
            <div className="text-[10px] text-white/40">Agency Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
        {/* Agency navigation */}
        <div className="mb-1">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest px-2 mb-1.5">Agency</p>
          {AgencyNavItems.slice(0, 5).map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* Client selector */}
        {isAgencyAdmin() && tenants.length > 0 && (
          <div className="mt-3 mb-1">
            <button
              onClick={() => setClientsOpen(!clientsOpen)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-medium text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
            >
              <span>Clients ({tenants.length})</span>
              <span className={cn('transition-transform', clientsOpen && 'rotate-180')}>▾</span>
            </button>

            {clientsOpen && (
              <div className="mt-1 space-y-0.5">
                {tenants.map((t, i) => {
                  const color = clientColor(i)
                  const isActive = pathname.includes(t.id)
                  return (
                    <Link
                      key={t.id}
                      href={`/clients/${t.id}`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-xs',
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                        color.bg, color.text
                      )}>
                        {initials(t.name)}
                      </div>
                      <span className="truncate">{t.name}</span>
                      {t.status === 'trial' && (
                        <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">trial</span>
                      )}
                    </Link>
                  )
                })}
                <Link
                  href="/clients/new"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/50 border border-dashed border-white/10 hover:border-white/20 transition-all mt-1"
                >
                  <span className="w-5 h-5 flex items-center justify-center">+</span>
                  <span>Add client</span>
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest px-2 mb-1.5">More</p>
          {AgencyNavItems.slice(5).map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center text-[10px] font-bold text-brand-400 flex-shrink-0">
            {user ? initials(user.fullName || user.email) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white/80 truncate">{user?.fullName || user?.email}</div>
            <div className="text-[10px] text-white/30 capitalize">{user?.role?.replace(/_/g, ' ')}</div>
          </div>
          <button
            onClick={logout}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
            title="Sign out"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname }: { item: typeof AgencyNavItems[0]; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-all mb-0.5',
        isActive
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
      )}
    >
      <span className="w-4 text-center text-sm">{item.icon}</span>
      {item.label}
    </Link>
  )
}
