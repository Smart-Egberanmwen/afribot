import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format kobo → ₦ string
export function formatNaira(kobo: number, compact = false): string {
  const naira = kobo / 100
  if (compact) {
    if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`
    if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira)
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    ...opts,
  }).format(new Date(iso))
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('234') && clean.length === 13) {
    return `+234 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`
  }
  return phone
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:     { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  trial:      { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  suspended:  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  cancelled:  { bg: 'bg-gray-100',  text: 'text-gray-600',   dot: 'bg-gray-400' },
  open:       { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  bot:        { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  handoff:    { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  resolved:   { bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400' },
  pending:    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  processing: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  ready:      { bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500' },
  delivered:  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelled_order: { bg: 'bg-red-50', text: 'text-red-700',  dot: 'bg-red-400' },
  paid:       { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  failed:     { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
}

export const CLIENT_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100',  text: 'text-violet-700' },
  { bg: 'bg-sky-100',     text: 'text-sky-700' },
  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  { bg: 'bg-rose-100',    text: 'text-rose-700' },
  { bg: 'bg-teal-100',    text: 'text-teal-700' },
  { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  { bg: 'bg-pink-100',    text: 'text-pink-700' },
]

export function clientColor(index: number) {
  return CLIENT_COLORS[index % CLIENT_COLORS.length]
}
