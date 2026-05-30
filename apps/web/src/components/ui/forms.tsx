'use client'
import { cn } from '@/lib/utils'
import { Spinner } from './primitives'
import { forwardRef, useState } from 'react'

// ── Button ────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children, variant = 'secondary', size = 'md', loading, icon, iconRight, className, disabled, ...props
}, ref) => {
  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-800 border-transparent',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200',
    ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 border-transparent',
    outline:   'bg-transparent text-brand-600 hover:bg-brand-50 border-brand-200',
    danger:    'bg-red-600 text-white hover:bg-red-700 border-transparent',
  }
  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-3.5 py-2 gap-2 rounded-lg',
    lg: 'text-sm px-5 py-2.5 gap-2 rounded-xl',
  }
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium border transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
      {iconRight}
    </button>
  )
})
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string
  error?: string
  hint?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, prefix, suffix, className, id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-gray-700">{label}</label>
      )}
      <div className="relative flex items-center">
        {prefix && <div className="absolute left-3 text-gray-400 text-sm">{prefix}</div>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400',
            'px-3 py-2 outline-none transition-all',
            'focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
            'disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-red-400 focus:ring-red-100',
            prefix && 'pl-9',
            suffix && 'pr-9',
            className
          )}
          {...props}
        />
        {suffix && <div className="absolute right-3 text-gray-400 text-sm">{suffix}</div>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string; hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, hint, className, id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-gray-700">{label}</label>}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400',
          'px-3 py-2 outline-none transition-all resize-none',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
          error && 'border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, className, id, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-xs font-medium text-gray-700">{label}</label>}
      <select
        ref={ref}
        id={inputId}
        className={cn(
          'w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-900',
          'px-3 py-2 outline-none transition-all appearance-none',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
          error && 'border-red-400',
          className
        )}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
})
Select.displayName = 'Select'

// ── Toggle ────────────────────────────────────────────
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-600' : 'bg-gray-300'
        )}
      >
        <div className={cn(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}

// ── Modal ─────────────────────────────────────────────
interface ModalProps {
  open: boolean; onClose: () => void
  title: string; children: React.ReactNode
  footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-popover flex flex-col max-h-[90vh] animate-slide-up', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────
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
        <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium',
          changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500'
        )}>
          {changeType === 'up' ? '↑' : changeType === 'down' ? '↓' : '—'}
          {change}
        </div>
      )}
    </div>
  )
}
