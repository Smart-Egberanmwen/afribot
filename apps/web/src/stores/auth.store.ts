import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/api'

interface AuthStore {
  user: User | null
  token: string | null
  activeTenantId: string | null
  setAuth: (user: User, token: string) => void
  setActiveTenant: (tenantId: string) => void
  logout: () => void
  isAgencyAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      activeTenantId: null,

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('afribot_token', token)
          // Set cookie for middleware access
          console.log('Setting auth cookie...')
          document.cookie = `afribot_token=${token}; path=/; max-age=31536000; SameSite=Lax; Secure`
          console.log('Cookie status:', document.cookie.includes('afribot_token'))
        }
        set({ user, token, activeTenantId: user.tenantId || null })
      },

      setActiveTenant: (tenantId) => set({ activeTenantId: tenantId }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('afribot_token')
          // Remove cookie
          document.cookie = 'afribot_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
        }
        set({ user: null, token: null, activeTenantId: null })
      },

      isAgencyAdmin: () => {
        const role = get().user?.role
        return role === 'super_admin' || role === 'agency_admin'
      },
    }),
    {
      name: 'afribot-auth',
      partialize: (state) => ({ user: state.user, token: state.token, activeTenantId: state.activeTenantId }),
    }
  )
)
