'use client'
import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { useTenants, useAnalytics } from '@/hooks/use-api'
import { Card, Skeleton } from '@/components/ui/primitives'
import { formatNaira, cn } from '@/lib/utils'

const DAILY = [
  { day:'Mon', revenue:92000, orders:11, msgs:380, contacts:12 },
  { day:'Tue', revenue:118000, orders:14, msgs:450, contacts:18 },
  { day:'Wed', revenue:87000, orders:9, msgs:310, contacts:9 },
  { day:'Thu', revenue:134000, orders:17, msgs:520, contacts:22 },
  { day:'Fri', revenue:156000, orders:19, msgs:610, contacts:31 },
  { day:'Sat', revenue:201000, orders:24, msgs:720, contacts:27 },
  { day:'Sun', revenue:178000, orders:21, msgs:650, contacts:19 },
]

const CLIENT_BREAKDOWN = [
  { name:'Mama Tee Kitchen', revenue:312000, orders:34, color:'#0F6E56' },
  { name:'Lagos Styles', revenue:289000, orders:28, color:'#534AB7' },
  { name:'TechFix', revenue:246000, orders:23, color:'#185FA5' },
  { name:'QuickFix Auto', revenue:0, orders:4, color:'#BA7517' },
]

const AI_STATS = [
  { name:'Claude', value:87, color:'#0F6E56' },
  { name:'GPT-4o', value:11, color:'#185FA5' },
  { name:'System', value:2, color:'#9E9C96' },
]

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium mb-1 text-white/70">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#fff' }}>{p.name}: {p.dataKey === 'revenue' ? formatNaira(p.value) : p.value}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7)
  const [selectedTenant, setSelectedTenant] = useState('')
  const { data: tenantsData } = useTenants()
  const tenants = tenantsData?.data || []

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-500 mt-0.5">Agency-wide performance overview</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedTenant} onChange={e => setSelectedTenant(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none">
            <option value="">All clients</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('px-2.5 py-1 text-xs rounded-md transition-colors',
                  days === d ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
                )}>{d}d</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue', value:'₦847K', change:'+18%', up:true },
          { label:'Orders', value:'89', change:'+6% vs last period', up:true },
          { label:'Messages', value:'4,640', change:'+24% vs last period', up:true },
          { label:'AI Resolution', value:'94%', change:'47 handoffs', up:null },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">{k.value}</div>
            <div className={cn('text-xs', k.up === true ? 'text-emerald-600' : k.up === false ? 'text-red-500' : 'text-gray-400')}>{k.change}</div>
          </Card>
        ))}
      </div>

      {/* Revenue + Orders chart */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Revenue (₦)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DAILY}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#0F6E56" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F0EEE8" strokeDasharray="3 0" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9E9C96' }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} tick={{ fontSize:10, fill:'#9E9C96' }} axisLine={false} tickLine={false} width={44}/>
              <Tooltip content={<Tip />}/>
              <Area type="monotone" dataKey="revenue" stroke="#0F6E56" strokeWidth={2.5} fill="url(#revG)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Messages & Contacts</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DAILY}>
              <CartesianGrid stroke="#F0EEE8" strokeDasharray="3 0" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9E9C96' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:'#9E9C96' }} axisLine={false} tickLine={false} width={30}/>
              <Tooltip content={<Tip />}/>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
              <Line type="monotone" dataKey="msgs" name="Messages" stroke="#185FA5" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="contacts" name="New contacts" stroke="#0F6E56" strokeWidth={2} dot={false} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Client breakdown + AI provider */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Revenue by Client</h2>
          </div>
          <div className="p-5 space-y-3">
            {CLIENT_BREAKDOWN.map(c => {
              const maxRev = Math.max(...CLIENT_BREAKDOWN.map(x => x.revenue))
              const pct = maxRev > 0 ? (c.revenue / maxRev) * 100 : 0
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-700 truncate">{c.name}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${pct}%`, background:c.color }}/>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold text-gray-800">{formatNaira(c.revenue, true)}</div>
                  <div className="w-12 text-right text-xs text-gray-400">{c.orders} orders</div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">AI Provider Usage</h2>
          <div className="flex justify-center mb-4">
            <PieChart width={160} height={160}>
              <Pie data={AI_STATS} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {AI_STATS.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-2">
            {AI_STATS.map(a => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background:a.color }}/>
                  <span className="text-gray-600">{a.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{a.value}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <div className="text-xs text-gray-500">Avg response time</div>
            <div className="text-xl font-semibold text-gray-900">1.2s</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
