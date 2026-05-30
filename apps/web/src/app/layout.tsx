import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/shared/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'AfriBot Agency OS',
  description: 'Multi-tenant WhatsApp AI Automation Platform',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1A1F1C',
                color: '#F0F0EE',
                fontSize: '13px',
                borderRadius: '8px',
                padding: '10px 14px',
              },
              success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
