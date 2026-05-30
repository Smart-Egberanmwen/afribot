'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useTenant, useTenantStats, useConversations, useOrders } from '@/hooks/use-api'
import { Card, StatusBadge, Skeleton, Avatar, LiveDot } from '@/components/ui/primitives'
import { Button } from '@/components/ui/forms'
import { formatNaira, formatRelative, clientColor, cn } from '@/lib/utils'

const TABS = ['Inbox', 'Orders', 'Contacts', 'Inventory', 'AI Agent', 'Analytics', 'Settings']

export default function ClientWorkspacePage() {
  const { clientId } = useParams<{ clientId: string }>()
  const [activeTab, setActiveTab] = useState('Inbox')
  const { data: tenant, isLoading } = useTenant(clientId)
  const { data: stats } = useTenantStats(clientId)

  if (isLoading) return <WorkspaceSkeleton />

  const color = clientColor(0)
  const initials = tenant?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'CL'

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Client header bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
        <Link href="/clients" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0', color.bg, color.text)}>
          {initials}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{tenant?.name}</div>
          <div className="text-xs text-gray-400 capitalize">{tenant?.businessType || (tenant as any)?.business_type} · {tenant?.whatsappAccounts?.[0]?.phoneNumber || 'No WA connected'}</div>
        </div>
        <StatusBadge status={tenant?.status || 'trial'} />

        {/* Quick stats */}
        <div className="hidden lg:flex items-center gap-4 px-4 border-l border-gray-200">
          {[
            { label: 'Contacts', value: stats?.totalContacts?.toLocaleString() || '—' },
            { label: 'Open chats', value: stats?.openConversations?.toLocaleString() || '—' },
            { label: 'Revenue', value: formatNaira(stats?.totalRevenueNgn || 0, true) },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-sm font-semibold text-gray-800">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="secondary">Send Broadcast</Button>
          <Link href={`/clients/${clientId}/ai-agent`}>
            <Button size="sm" variant="secondary">⚙ AI Config</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-5">
        <div className="flex gap-0.5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'Inbox' && <InboxTab clientId={clientId} />}
        {activeTab === 'Orders' && <OrdersTab clientId={clientId} />}
        {activeTab === 'Contacts' && <ContactsTab clientId={clientId} />}
        {activeTab === 'Inventory' && (
          <div className="p-5">
            <Link href={`/clients/${clientId}/inventory`}>
              <Button variant="primary">Open Inventory Manager →</Button>
            </Link>
          </div>
        )}
        {activeTab === 'AI Agent' && (
          <div className="p-5">
            <Link href={`/clients/${clientId}/ai-agent`}>
              <Button variant="primary">Open AI Agent Config →</Button>
            </Link>
          </div>
        )}
        {activeTab === 'Analytics' && <AnalyticsTab clientId={clientId} />}
      </div>
    </div>
  )
}

// ── Inbox Tab ─────────────────────────────────────────
function InboxTab({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const { data, isLoading } = useConversations(clientId, { limit: 30 })
  const conversations = data?.data || []

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-72 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <input className="w-full text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Search conversations..." />
        </div>
        {isLoading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400">No conversations yet</div>
        ) : conversations.map((conv: any) => {
          const name = conv.contacts?.name || conv.contacts?.whatsapp_number || 'Unknown'
          const lastMsg = conv.messages?.[0]
          const isHandoff = conv.status === 'handoff'
          return (
            <div
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={cn(
                'flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-gray-50 transition-colors',
                selected === conv.id ? 'bg-brand-50' : 'hover:bg-gray-50'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800 truncate">{name}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{formatRelative(conv.updated_at)}</span>
                </div>
                <div className="text-[11px] text-gray-500 truncate mt-0.5">{lastMsg?.content || 'No messages yet'}</div>
                <div className="mt-1">
                  <StatusBadge status={conv.status} className="text-[9px] py-0.5" />
                  {isHandoff && <span className="ml-1 text-[9px] text-orange-600 font-medium">⚡ Needs handoff</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Message view */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selected ? (
          <MessageThread clientId={clientId} conversationId={selected} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-sm font-medium text-gray-600">Select a conversation</div>
              <div className="text-xs text-gray-400 mt-1">Pick from the list to view messages</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageThread({ clientId, conversationId }: { clientId: string; conversationId: string }) {
  const { data: messages, isLoading } = useConversations(clientId, {})
  // In real app: use useMessages(clientId, conversationId)
  const mockMessages = [
    { id: '1', direction: 'inbound', content: 'Hello, I want to order jollof rice for 4 people please', sentAt: new Date(Date.now() - 300000).toISOString(), aiGenerated: false },
    { id: '2', direction: 'outbound', content: 'Hello! 👋 Welcome to Mama Tee Kitchen! Our jollof rice serves 2 people per portion. For 4 people you\'ll need 2 portions. That\'ll be ₦4,800. Would you like to proceed with the order? 😊', sentAt: new Date(Date.now() - 280000).toISOString(), aiGenerated: true },
    { id: '3', direction: 'inbound', content: 'Yes please, deliver to 25 Admiralty Way Lekki', sentAt: new Date(Date.now() - 260000).toISOString(), aiGenerated: false },
    { id: '4', direction: 'outbound', content: 'Perfect! 🎉 I\'ve created your order:\n\n📋 Order #ORD-0527-0023\n• Jollof Rice x2 — ₦4,800\n• Delivery to Lekki — ₦1,500\n\nTotal: ₦6,300\n\nHere\'s your payment link: https://paystack.com/pay/mama-tee-6300\n\nOnce paid, your food will be delivered in 45-60 mins 🍱', sentAt: new Date(Date.now() - 240000).toISOString(), aiGenerated: true },
    { id: '5', direction: 'inbound', content: 'Ok I\'ve paid', sentAt: new Date(Date.now() - 120000).toISOString(), aiGenerated: false },
    { id: '6', direction: 'outbound', content: '✅ Payment confirmed! Thank you Amara! Your order is being prepared and will be delivered in approximately 45 minutes. We\'ll send you a message when it\'s on the way 🚗💨', sentAt: new Date(Date.now() - 100000).toISOString(), aiGenerated: true },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockMessages.map(msg => (
          <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-xs lg:max-w-md rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              msg.direction === 'outbound'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : 'bg-white text-gray-800 shadow-card rounded-bl-sm'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className={cn('flex items-center gap-1.5 mt-1', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                <span className={cn('text-[10px]', msg.direction === 'outbound' ? 'text-white/60' : 'text-gray-400')}>
                  {formatRelative(msg.sentAt)}
                </span>
                {msg.aiGenerated && (
                  <span className={cn('text-[9px] px-1 rounded', msg.direction === 'outbound' ? 'bg-white/20 text-white/80' : 'bg-purple-100 text-purple-600')}>
                    AI
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Staff reply box */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <textarea
              rows={2}
              className="w-full bg-transparent text-sm resize-none outline-none text-gray-800 placeholder:text-gray-400"
              placeholder="Reply as staff (bypasses AI)..."
            />
          </div>
          <Button variant="primary" size="sm">Send</Button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span>🤖 AI is handling · </span>
          <button className="text-orange-600 hover:underline">Request handoff</button>
          <span>·</span>
          <button className="text-gray-500 hover:underline">Resolve</button>
        </div>
      </div>
    </div>
  )
}

// ── Orders Tab ────────────────────────────────────────
function OrdersTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useOrders(clientId)
  const orders = data?.data || []

  const mockOrders = [
    { id: '1', orderNumber: 'ORD-0527-0023', status: 'pending', paymentStatus: 'paid', totalNgn: 630000, createdAt: new Date(Date.now() - 300000).toISOString(), contacts: { name: 'Amara Kalu', whatsappNumber: '+2349012345678' } },
    { id: '2', orderNumber: 'ORD-0527-0022', status: 'confirmed', paymentStatus: 'paid', totalNgn: 420000, createdAt: new Date(Date.now() - 1200000).toISOString(), contacts: { name: 'Tunde Eze', whatsappNumber: '+2348023456789' } },
    { id: '3', orderNumber: 'ORD-0527-0021', status: 'delivered', paymentStatus: 'paid', totalNgn: 380000, createdAt: new Date(Date.now() - 7200000).toISOString(), contacts: { name: 'Ngozi Okafor', whatsappNumber: '+2347034567890' } },
  ]
  const display = orders.length > 0 ? orders : mockOrders

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Orders</h2>
        <div className="flex gap-1.5">
          {['all', 'pending', 'confirmed', 'delivered'].map(s => (
            <button key={s} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 capitalize transition-colors">{s}</button>
          ))}
        </div>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">
              {['Order', 'Customer', 'Total', 'Payment', 'Status', 'Time', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((order: any) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-gray-800">{order.contacts?.name}</div>
                  <div className="text-[10px] text-gray-400">{order.contacts?.whatsappNumber}</div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatNaira(order.totalNgn || 0)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.paymentStatus} /></td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost">View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Contacts Tab ──────────────────────────────────────
function ContactsTab({ clientId }: { clientId: string }) {
  const mockContacts = [
    { id: '1', name: 'Amara Kalu', whatsappNumber: '+2349012345678', totalOrders: 5, totalSpentNgn: 3150000, lastInteractionAt: new Date(Date.now() - 300000).toISOString(), tags: ['VIP', 'Regular'] },
    { id: '2', name: 'Tunde Eze', whatsappNumber: '+2348023456789', totalOrders: 3, totalSpentNgn: 1890000, lastInteractionAt: new Date(Date.now() - 1200000).toISOString(), tags: ['Regular'] },
    { id: '3', name: 'Ngozi Okafor', whatsappNumber: '+2347034567890', totalOrders: 8, totalSpentNgn: 5640000, lastInteractionAt: new Date(Date.now() - 7200000).toISOString(), tags: ['VIP'] },
  ]
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Contacts ({mockContacts.length})</h2>
        <input className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg outline-none w-40" placeholder="Search contacts..." />
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50 border-b border-gray-100">
              {['Name', 'WhatsApp', 'Orders', 'Spent', 'Last seen', 'Tags'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockContacts.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.whatsappNumber}</td>
                <td className="px-4 py-3 text-sm font-medium">{c.totalOrders}</td>
                <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatNaira(c.totalSpentNgn, true)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(c.lastInteractionAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {c.tags.map(tag => (
                      <span key={tag} className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────
function AnalyticsTab({ clientId }: { clientId: string }) {
  return (
    <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Total Revenue', value: '₦847K', change: '+18%', up: true },
        { label: 'Total Orders', value: '89', change: '+6%', up: true },
        { label: 'Total Contacts', value: '423', change: '+31 this week', up: true },
        { label: 'AI Resolution', value: '94%', change: '3 handoffs today', up: null },
      ].map(s => (
        <Card key={s.label} className="p-4">
          <div className="text-xs text-gray-500 mb-2">{s.label}</div>
          <div className="text-2xl font-semibold text-gray-900">{s.value}</div>
          <div className={cn('text-xs mt-1', s.up === true ? 'text-emerald-600' : s.up === false ? 'text-red-600' : 'text-gray-400')}>{s.change}</div>
        </Card>
      ))}
    </div>
  )
}

function WorkspaceSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-10 rounded-xl w-96" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  )
}
