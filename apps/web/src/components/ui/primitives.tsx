'use client'
import { cn, STATUS_COLORS, initials, clientColor } from '@/lib/utils'

// ── Badge ─────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    green:   'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    red:     'bg-red-50 text-red-700',
    blue:    'bg-blue-50 text-blue-700',
    purple:  'bg-purple-50 text-purple-700',
    gray:    'bg-gray-100 text-gray-500',
  }
  const sizes = { sm: 'text-[10px] px-1.5 py-0.5', md: 'text-xs px-2 py-0.5' }
  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

// ── StatusBadge ───────────────────────────────────────
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS['gray'] || { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2 py-0.5', colors.bg, colors.text, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' }
  return (
    <svg className={cn('animate-spin text-brand-600', sizes[size], className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Avatar ────────────────────────────────────────────
interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  index?: number
  className?: string
}

export function Avatar({ name, src, size = 'md', index = 0, className }: AvatarProps) {
  const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  const color = clientColor(index)
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size], className)} />
  }
  return (
    <div className={cn('rounded-xl flex items-center justify-center font-semibold flex-shrink-0', sizes[size], color.bg, color.text, className)}>
      {initials(name)}
    </div>
  )
}

// ── LiveDot ───────────────────────────────────────────
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}

// ── EmptyState ────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-sm font-medium text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-500 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────
export function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-card',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:-translate-y-px transition-all duration-150',
        className
      )}
    >
      {children}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded', className)} />
}

// ── Divider ───────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-gray-100', className)} />
}

// ── StatCard ──────────────────────────────────────────
export function StatCard({ label, value, change, changeType, icon, loading }: {
  label: string; value: string; change?: string; changeType?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      {loading ? (
        <div className="h-8 bg-gray-100 rounded animate-pulse w-24" />
      ) : (
        <div className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</div>
      )}
      {change && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
          {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '—'} {change}
        </div>
      )}
    </div>
  )
}
