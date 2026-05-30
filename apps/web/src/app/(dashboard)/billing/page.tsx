'use client'
import { useState } from 'react'
import { useTenants } from '@/hooks/use-api'
import { Card, StatusBadge, Badge } from '@/components/ui/primitives'
import { Button, Modal, Input } from '@/components/ui/forms'
import { formatNaira, formatDate, cn } from '@/lib/utils'

const PLANS = [
  { id:'starter', name:'Starter', price:15000, features:['1 WhatsApp number','500 AI messages/mo','Basic inventory','Email support'] },
  { id:'growth', name:'Growth', price:25000, features:['2 WhatsApp numbers','2,000 AI messages/mo','Full inventory + orders','Priority support','Broadcasts'] },
  { id:'pro', name:'Pro', price:45000, features:['3 WhatsApp numbers','5,000 AI messages/mo','Full features','Analytics','Dedicated support'] },
  { id:'enterprise', name:'Enterprise', price:null, features:['Unlimited numbers','Unlimited AI','White-label option','SLA guarantee','Custom integrations'] },
]

const MOCK_INVOICES = [
  { id:'INV-2026-005', tenant:'Mama Tee Kitchen', period:'May 2026', amount:2500000, status:'paid', paidAt:'2026-05-01' },
  { id:'INV-2026-004', tenant:'Lagos Styles', period:'May 2026', amount:1500000, status:'paid', paidAt:'2026-05-01' },
  { id:'INV-2026-003', tenant:'TechFix Electronics', period:'May 2026', amount:4500000, status:'paid', paidAt:'2026-05-01' },
  { id:'INV-2026-002', tenant:'QuickFix Auto', period:'May 2026', amount:0, status:'pending', paidAt:null },
  { id:'INV-2026-001', tenant:'Mama Tee Kitchen', period:'Apr 2026', amount:2500000, status:'paid', paidAt:'2026-04-01' },
]

export default function BillingPage() {
  const { data: tenantsData } = useTenants()
  const tenants = tenantsData?.data || []
  const [showPricing, setShowPricing] = useState(false)

  const totalMRR = tenants.reduce((s, t) => s + (t.monthlyFeeNgn || 0), 0)
  const activeCount = tenants.filter(t => t.status === 'active').length

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Billing & Subscriptions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage client subscriptions and revenue</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowPricing(true)}>View pricing plans</Button>
      </div>

      {/* MRR summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Monthly Recurring Revenue', value:formatNaira(totalMRR, true), sub:'MRR' },
          { label:'Annual Run Rate', value:formatNaira(totalMRR * 12, true), sub:'ARR' },
          { label:'Paying Clients', value:activeCount.toString(), sub:`of ${tenants.length} total` },
          { label:'Avg Revenue/Client', value:activeCount > 0 ? formatNaira(Math.round(totalMRR/activeCount), true) : '₦0', sub:'per month' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-2xl font-semibold text-brand-600">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Client subscriptions */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Client Subscriptions</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80 border-b border-gray-100">
              {['Client', 'Plan', 'Monthly Fee', 'Status', 'Next Billing', ''].map(h => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tenants.length > 0 ? tenants : [
              { id:'1', name:'Mama Tee Kitchen', subscriptionPlan:'growth', monthlyFeeNgn:2500000, status:'active', subscriptionEnd:'2026-06-01' },
              { id:'2', name:'Lagos Styles Boutique', subscriptionPlan:'starter', monthlyFeeNgn:1500000, status:'active', subscriptionEnd:'2026-06-01' },
              { id:'3', name:'TechFix Electronics', subscriptionPlan:'pro', monthlyFeeNgn:4500000, status:'active', subscriptionEnd:'2026-06-01' },
              { id:'4', name:'QuickFix Auto', subscriptionPlan:'starter', monthlyFeeNgn:0, status:'trial', subscriptionEnd:'2026-06-01' },
            ] as any[]).map((t: any) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{t.name}</td>
                <td className="px-5 py-3">
                  <span className="capitalize text-sm text-gray-600">{t.subscriptionPlan || t.subscription_plan}</span>
                </td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatNaira(t.monthlyFeeNgn || t.monthly_fee_ngn || 0)}</td>
                <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-5 py-3 text-xs text-gray-500">{t.subscriptionEnd ? formatDate(t.subscriptionEnd) : '—'}</td>
                <td className="px-5 py-3">
                  <Button size="sm" variant="ghost">Edit plan</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Recent Invoices</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80 border-b border-gray-100">
              {['Invoice', 'Client', 'Period', 'Amount', 'Status', 'Paid'].map(h => (
                <th key={h} className="text-left font-medium px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map(inv => (
              <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-gray-600">{inv.id}</td>
                <td className="px-5 py-3 text-sm text-gray-800">{inv.tenant}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{inv.period}</td>
                <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatNaira(inv.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-5 py-3 text-xs text-gray-400">{inv.paidAt ? formatDate(inv.paidAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Pricing Modal */}
      <Modal open={showPricing} onClose={() => setShowPricing(false)} title="Pricing Plans" size="xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className={cn('rounded-xl border-2 p-4 relative', plan.id === 'growth' ? 'border-brand-600 bg-brand-50' : 'border-gray-200')}>
              {plan.id === 'growth' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] px-2 py-0.5 rounded-full">Popular</div>
              )}
              <div className="text-sm font-bold text-gray-900 mb-1">{plan.name}</div>
              <div className="text-2xl font-bold text-brand-600 mb-1">
                {plan.price ? formatNaira(plan.price * 100) : 'Custom'}
              </div>
              <div className="text-[10px] text-gray-400 mb-3">per month</div>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-emerald-500 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
