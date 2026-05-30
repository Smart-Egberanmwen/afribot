'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      const res = await authApi.login(form.email, form.password)
      setAuth(res.data.user, res.data.accessToken)
      toast.success(`Welcome back, ${res.data.user.fullName?.split(' ')[0] || 'Admin'}!`)
      // Hard navigate so browser commits the cookie before requesting /dashboard
      window.location.href = '/dashboard'
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-slide-up">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C5.582 2 2 5.582 2 10s3.582 8 8 8 8-3.582 8-8-3.582-8-8-8zm0 3.2c1.105 0 2 .895 2 2s-.895 2-2 2-2-.895-2-2 .895-2 2-2zm0 9.6c-2 0-3.77-1.02-4.8-2.568.025-1.52 2.55-2.432 4.8-2.432s4.775.912 4.8 2.432C13.77 13.78 12 14.8 10 14.8z" fill="white"/>
          </svg>
        </div>
        <div>
          <div className="text-white font-semibold text-lg leading-none">AfriBot OS</div>
          <div className="text-white/40 text-xs">Agency Dashboard</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-popover p-7">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">Access your agency dashboard</p>

        {err && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="admin@youragency.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <button type="button" className="text-xs text-brand-600 hover:underline">Forgot?</button>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Signing in...</>
            ) : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-brand-600 hover:underline font-medium">Create one</Link>
        </div>
      </div>

      <p className="text-center text-xs text-white/20 mt-5">AfriBot Agency OS · Lagos, Nigeria</p>
    </div>
  )
}
