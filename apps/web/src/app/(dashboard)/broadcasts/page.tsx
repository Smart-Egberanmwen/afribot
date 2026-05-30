'use client'
import { useState } from 'react'
import { useTenants } from '@/hooks/use-api'
import { Card, StatusBadge, Badge } from '@/components/ui/primitives'
import { Button, Input, Textarea, Select, Modal } from '@/components/ui/forms'
import { formatDate, formatRelative, cn } from '@/lib/utils'

const MOCK_BROADCASTS = [
  { id:'1', name:'May Promo — Mama Tee', tenant:'Mama Tee Kitchen', status:'sent', recipients:234, sent:234, delivered:221, read:187, failed:13, scheduledAt:null, completedAt:new Date(Date.now()-86400000).toISOString() },
  { id:'2', name:'New Arrivals Drop', tenant:'Lagos Styles', status:'sent', recipients:189, sent:189, delivered:178, read:142, failed:11, scheduledAt:null, completedAt:new Date(Date.now()-172800000).toISOString() },
  { id:'3', name:'Service Reminder — June', tenant:'QuickFix Auto', status:'scheduled', recipients:67, sent:0, delivered:0, read:0, failed:0, scheduledAt:new Date(Date.now()+86400000).toISOString(), completedAt:null },
  { id:'4', name:'Weekend Discount 20%', tenant:'Lagos Styles', status:'draft', recipients:0, sent:0, delivered:0, read:0, failed:0, scheduledAt:null, completedAt:null },
]

export default function BroadcastsPage() {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name:'', tenantId:'', message:'', scheduleNow:true })
  const { data: tenantsData } = useTenants()
  const tenants = tenantsData?.data || []

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Broadcasts</h1>
          <p className="text-xs text-gray-500 mt-0.5">Send bulk WhatsApp messages to client contacts</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)} icon={<span>+</span>}>New Broadcast</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Broadcasts Sent', value:'6', sub:'this month' },
          { label:'Total Delivered', value:'1,234', sub:'all campaigns' },
          { label:'Avg Read Rate', value:'79%', sub:'above industry avg' },
          { label:'Scheduled', value:'1', sub:'upcoming' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-2xl font-semibold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Broadcast list */}
      <div className="space-y-3">
        {MOCK_BROADCASTS.map(b => {
          const delivRate = b.sent > 0 ? Math.round((b.delivered/b.sent)*100) : 0
          const readRate = b.delivered > 0 ? Math.round((b.read/b.delivered)*100) : 0
          return (
            <Card key={b.id} className="p-4 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{b.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.tenant}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} />
                  {b.status === 'draft' && <Button size="sm" variant="primary">Send now</Button>}
                  {b.status === 'scheduled' && <Button size="sm" variant="secondary">Edit</Button>}
                </div>
              </div>

              {b.status === 'sent' ? (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label:'Recipients', value:b.recipients, color:'text-gray-800' },
                    { label:'Delivered', value:`${b.delivered} (${delivRate}%)`, color:'text-blue-600' },
                    { label:'Read', value:`${b.read} (${readRate}%)`, color:'text-emerald-600' },
                    { label:'Failed', value:b.failed, color:'text-red-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <div className={cn('text-base font-bold', s.color)}>{s.value}</div>
                      <div className="text-[10px] text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              ) : b.status === 'scheduled' ? (
                <div className="text-xs text-gray-500">
                  Scheduled for {formatDate(b.scheduledAt!)} · {b.recipients} recipients
                </div>
              ) : (
                <div className="text-xs text-gray-400">Draft — not sent yet · Set recipients and message to send</div>
              )}

              {b.completedAt && (
                <div className="text-[10px] text-gray-400 mt-2">Sent {formatRelative(b.completedAt)}</div>
              )}
            </Card>
          )
        })}
      </div>

      {/* New Broadcast Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Broadcast" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary">Create Broadcast</Button>
        </>}>
        <div className="space-y-4">
          <Input label="Campaign Name" placeholder="e.g. May Weekend Promo" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
          <Select label="Client" options={[{ value:'', label:'Select client...' }, ...tenants.map(t => ({ value:t.id, label:t.name }))]}
            value={form.tenantId} onChange={e => setForm({...form, tenantId:e.target.value})} />
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Recipients</label>
            <div className="flex gap-2">
              {['All contacts', 'Tagged: VIP', 'Tagged: Regular', 'Custom filter'].map(opt => (
                <button key={opt} className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 bg-white hover:border-brand-400 hover:text-brand-600 transition-colors">{opt}</button>
              ))}
            </div>
          </div>
          <Textarea label="Message" rows={5} placeholder="Type your broadcast message here...&#10;&#10;Tips: Keep it short and conversational. Include a clear call-to-action." value={form.message} onChange={e => setForm({...form, message:e.target.value})} />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>⚠ WhatsApp Policy:</strong> Broadcast messages must use approved message templates if the customer hasn't messaged you in the last 24 hours.
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="radio" name="schedule" defaultChecked className="accent-brand-600" />
              Send immediately
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input type="radio" name="schedule" className="accent-brand-600" />
              Schedule for later
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
