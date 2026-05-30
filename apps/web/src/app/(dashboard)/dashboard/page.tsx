'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { useAgencyOverview, useInventoryAlerts } from '@/hooks/use-api'
import { StatCard, Card, Badge, StatusBadge, Skeleton, Avatar, EmptyState, LiveDot } from '@/components/ui/primitives'
import { Button } from '@/components/ui/forms'
import { formatNaira, formatRelative, clientColor, cn } from '@/lib/utils'

// Mock daily data — replaced by real analytics in production
const mockDaily = [
  { day: 'Mon', revenue: 92000, orders: 11, msgs: 380 },
  { day: 'Tue', revenue: 118000, orders: 14, msgs: 450 },
  { day: 'Wed', revenue: 87000, orders: 9, msgs: 310 },
  { day: 'Thu', revenue: 134000, orders: 17, msgs: 520 },
  { day: 'Fri', revenue: 156000, orders: 19, msgs: 610 },
  { day: 'Sat', revenue: 201000, orders: 24, msgs: 720 },
  { day: 'Sun', revenue: 178000, orders: 21, msgs: 650 },
]

const mockConversations = [
  { id: '1', name: 'Amara Kalu', client: 'Mama Tee Kitchen', preview: 'I want to order jollof rice for 4 people please', time: '2m', unread: true },
  { id: '2', name: 'Babatunde Eze', client: 'Lagos Styles', preview: 'Do you have the ankara wrap dress in size 12?', time: '5m', unread: true },
  { id: '3', name: 'Fatima Okonkwo', client: 'TechFix', preview: 'My iPhone screen cracked, how much to fix?', time: '9m', unread: false },
  { id: '4', name: 'Chidi Nwosu', client: 'QuickFix Auto', preview: 'Good morning, I need to book for car service', time: '15m', unread: false },
  { id: '5', name: 'Ngozi Adeyemi', client: 'Lagos Styles', preview: 'Is my order ready for pickup?', time: '22m', unread: false },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-popover">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'revenue' ? formatNaira(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useAgencyOverview()
  const [activeTab, setActiveTab] = useState<'revenue' | 'messages'>('revenue')

  const mrr = overview?.monthlyRecurringRevenueNgn || 0
  const totalClients = overview?.totalClients || 0
  const activeClients = overview?.activeClients || 0
  const todayMsgs = overview?.todayMessages || 0
  const todayRevenue = overview?.todayOrderRevenueNgn || 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Revenue (MRR)"
          value={isLoading ? '—' : formatNaira(mrr, true)}
          change="+18% vs last month"
          changeType="up"
          loading={isLoading}
          icon={<span className="text-base">₦</span>}
        />
        <StatCard
          label="Active Clients"
          value={isLoading ? '—' : `${activeClients} / ${totalClients}`}
          change={`${totalClients - activeClients} on trial`}
          changeType="neutral"
          loading={isLoading}
          icon={<span className="text-base">◈</span>}
        />
        <StatCard
          label="Messages Today"
          value={isLoading ? '—' : todayMsgs.toLocaleString()}
          change="+24% vs yesterday"
          changeType="up"
          loading={isLoading}
          icon={<LiveDot />}
        />
        <StatCard
          label="Order Revenue Today"
          value={isLoading ? '—' : formatNaira(todayRevenue, true)}
          change="89 orders this week"
          changeType="up"
          loading={isLoading}
          icon={<span className="text-base">◳</span>}
        />
      </div>

      {/* Alert banner */}
      <AlertBanner />

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Revenue chart */}
        <div className="xl:col-span-2">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">7-Day Performance</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {(['revenue', 'messages'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md transition-all capitalize',
                      activeTab === tab ? 'bg-white text-gray-800 shadow-sm font-medium' : 'text-gray-500'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              {activeTab === 'revenue' ? (
                <AreaChart data={mockDaily}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0F6E56" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F0EEE8" strokeDasharray="3 0" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9E9C96' }} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: '#9E9C96' }} axisLine={false} tickLine={false} width={48}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Area type="monotone" dataKey="revenue" stroke="#0F6E56" strokeWidth={2} fill="url(#revGrad)" dot={false}/>
                </AreaChart>
              ) : (
                <BarChart data={mockDaily}>
                  <CartesianGrid stroke="#F0EEE8" strokeDasharray="3 0" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9E9C96' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 10, fill: '#9E9C96' }} axisLine={false} tickLine={false} width={36}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Bar dataKey="msgs" name="messages" fill="#0F6E56" radius={[3,3,0,0]} opacity={0.85}/>
                </BarChart>
              )}
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Live conversations */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-800">Live Conversations</h2>
              <LiveDot />
            </div>
            <Link href="/conversations" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-hide">
            {mockConversations.map(conv => (
              <div
                key={conv.id}
                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 mt-0.5">
                  {conv.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800">{conv.name}</span>
                    {conv.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <div className="text-[10px] text-gray-400 mb-0.5">{conv.client}</div>
                  <div className="text-xs text-gray-500 truncate">{conv.preview}</div>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{conv.time}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 mt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">12 open · 3 need handoff</span>
            <span className="text-emerald-600 font-medium">AI: 78%</span>
          </div>
        </Card>
      </div>

      {/* Clients table + low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ClientsTable overview={overview} loading={isLoading} />
        <LowStockPanel />
      </div>
    </div>
  )
}

function AlertBanner() {
  const { data: allAlerts } = useInventoryAlerts('')
  const count = 2 // demo
  if (!count) return null
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <span className="text-amber-500 text-base flex-shrink-0">⚠</span>
      <div className="flex-1 text-xs text-amber-800">
        <strong>2 alerts require attention:</strong> Lagos Styles has 3 low-stock items · QuickFix trial expires in 4 days
      </div>
      <Link href="/inventory" className="text-xs text-amber-700 font-medium hover:underline flex-shrink-0">
        View →
      </Link>
    </div>
  )
}

function ClientsTable({ overview, loading }: { overview: any; loading: boolean }) {
  const clients = overview?.clients || []

  const mockClients = [
    { id: '1', name: 'Mama Tee Kitchen', business_type: 'Restaurant', status: 'active', revenue: 31200000, msgs: 486, plan: 'Growth' },
    { id: '2', name: 'Lagos Styles Boutique', business_type: 'Fashion', status: 'active', revenue: 28900000, msgs: 312, plan: 'Starter' },
    { id: '3', name: 'TechFix Electronics', business_type: 'Electronics', status: 'active', revenue: 24600000, msgs: 198, plan: 'Pro' },
    { id: '4', name: 'QuickFix Auto', business_type: 'Automotive', status: 'trial', revenue: 0, msgs: 238, plan: 'Trial' },
  ]

  const displayClients = clients.length > 0 ? clients : mockClients

  return (
    <Card className="xl:col-span-2 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Client Performance</h2>
        <Link href="/clients">
          <Button size="sm" variant="ghost">Manage all →</Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80">
              <th className="text-left font-medium px-5 py-3">Client</th>
              <th className="text-left font-medium px-3 py-3 hidden sm:table-cell">Plan</th>
              <th className="text-right font-medium px-3 py-3">Revenue</th>
              <th className="text-right font-medium px-3 py-3 hidden md:table-cell">Msgs Today</th>
              <th className="text-right font-medium px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-14 ml-auto rounded-full" /></td>
                </tr>
              ))
            ) : displayClients.map((c: any, i: number) => {
              const color = clientColor(i)
              return (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-2.5">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0', color.bg, color.text)}>
                        {c.name.split(' ').map((w: string) => w[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-[13px] hover:text-brand-600 transition-colors">{c.name}</div>
                        <div className="text-[10px] text-gray-400">{c.business_type || c.businessType}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <span className="text-xs text-gray-500">{c.plan || c.subscriptionPlan || 'Starter'}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-800">{formatNaira(c.revenue || c.totalRevenueNgn || 0, true)}</span>
                  </td>
                  <td className="px-3 py-3 text-right hidden md:table-cell">
                    <span className="text-xs text-gray-500">{(c.msgs || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function LowStockPanel() {
  const mockAlerts = [
    { name: 'Ankara Wrap Dress (M)', client: 'Lagos Styles', qty: 3, max: 50 },
    { name: 'Jollof Rice Pot (Lg)', client: 'Mama Tee', qty: 6, max: 30 },
    { name: 'iPhone 14 Screen', client: 'TechFix', qty: 8, max: 30 },
    { name: 'Agbada Suit Set XL', client: 'Lagos Styles', qty: 0, max: 20 },
    { name: 'Engine Oil 5W30 4L', client: 'QuickFix Auto', qty: 11, max: 40 },
  ]

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Low Stock Alerts</h2>
        <Link href="/inventory" className="text-xs text-brand-600 hover:underline">View all</Link>
      </div>
      <div className="space-y-3">
        {mockAlerts.map((item, i) => {
          const pct = Math.round((item.qty / item.max) * 100)
          const isOut = item.qty === 0
          const isLow = !isOut && pct < 25
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate">{item.name}</div>
                <div className="text-[10px] text-gray-400">{item.client}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn('text-xs font-semibold', isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-600')}>
                  {item.qty} left
                </span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500')}
                    style={{ width: `${Math.max(pct, isOut ? 0 : 3)}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Link href="/inventory">
        <Button size="sm" variant="outline" className="w-full mt-4 justify-center">Restock items →</Button>
      </Link>
    </Card>
  )
}
