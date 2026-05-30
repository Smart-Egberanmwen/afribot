'use client'
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { Card } from '@/components/ui/primitives'
import { Button, Input, Textarea, Toggle } from '@/components/ui/forms'
import { cn } from '@/lib/utils'

const SECTIONS = ['Agency Profile', 'WhatsApp Setup', 'Team Members', 'Notifications', 'API & Webhooks', 'Security']

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [active, setActive] = useState('Agency Profile')
  const [saved, setSaved] = useState(false)

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="flex h-full animate-fade-in">
      {/* Sidebar nav */}
      <div className="w-48 border-r border-gray-200 bg-white p-3 flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-2">Settings</div>
        <nav className="space-y-0.5">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setActive(s)}
              className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                active === s ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}>{s}</button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {active === 'Agency Profile' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">Agency Profile</h1>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Your Agency Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Agency Name" defaultValue="AfriBot Agency" />
                  <Input label="Your Name" defaultValue={user?.fullName || ''} />
                </div>
                <Input label="Agency Email" defaultValue={user?.email || ''} />
                <Input label="WhatsApp Number" placeholder="+2348012345678" />
                <Input label="Website" placeholder="https://youragency.com" />
                <Textarea label="Agency Description" rows={3} placeholder="What does your agency do?" />
                <Button variant="primary" onClick={save}>{saved ? '✓ Saved!' : 'Save Changes'}</Button>
              </Card>
            </>
          )}

          {active === 'WhatsApp Setup' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">WhatsApp Setup</h1>
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">360Dialog Agency Configuration</h2>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Recommended BSP</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p><strong>Setup steps:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                    <li>Apply at 360dialog.com/partners for agency account</li>
                    <li>Get your Partner Token (takes 1-3 days)</li>
                    <li>For each client, create a channel and get their API key</li>
                    <li>Add the API key when onboarding each client below</li>
                  </ol>
                </div>
                <Input label="360Dialog Partner Token" type="password" placeholder="your-partner-token" />
                <Input label="360Dialog Partner ID" placeholder="your-partner-id" />
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Webhook Configuration</h3>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 break-all">
                    https://your-api-domain.com/api/v1/whatsapp/webhook
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Set this URL in your 360Dialog dashboard → Webhooks</p>
                </div>
                <Button variant="primary" onClick={save}>Save Configuration</Button>
              </Card>

              <Card className="p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800">Webhook Verify Token</h2>
                <Input label="Verify Token" defaultValue="afribot-webhook-2026" hint="Set this same value in your Meta App webhook configuration" />
                <Button variant="secondary">Rotate token</Button>
              </Card>
            </>
          )}

          {active === 'Team Members' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">Team Members</h1>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-500">Manage who has access to your agency dashboard</p>
                  <Button variant="primary" size="sm">Invite member</Button>
                </div>
                <div className="space-y-3">
                  {[
                    { name: user?.fullName || 'You', email: user?.email || '', role: 'Super Admin', you: true },
                    { name: 'Chidi Okonkwo', email: 'chidi@agency.com', role: 'Agency Admin', you: false },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700">
                        {m.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{m.name} {m.you && <span className="text-xs text-gray-400">(you)</span>}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.role}</span>
                      {!m.you && <Button size="sm" variant="ghost" className="text-red-500">Remove</Button>}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {active === 'Notifications' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">Notifications</h1>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Alert Preferences</h2>
                {[
                  { label:'Low stock alerts', desc:'Get notified when any client product is running low', def:true },
                  { label:'Human handoff requests', desc:'Alert when a customer requests to speak with staff', def:true },
                  { label:'New orders', desc:'Notification for every new order placed', def:false },
                  { label:'Payment received', desc:'Alert when a Paystack payment is confirmed', def:true },
                  { label:'Client subscription renewal', desc:'Reminder 7 days before client billing date', def:true },
                  { label:'AI agent errors', desc:'Alert when AI fails to respond more than 3 times', def:true },
                ].map(n => (
                  <div key={n.label} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-700">{n.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{n.desc}</div>
                    </div>
                    <Toggle checked={n.def} onChange={() => {}} />
                  </div>
                ))}
                <Button variant="primary" onClick={save}>Save Preferences</Button>
              </Card>
            </>
          )}

          {active === 'API & Webhooks' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">API & Webhooks</h1>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">API Keys</h2>
                <div className="space-y-2">
                  {[
                    { label:'Anthropic (Claude)', key:'ANTHROPIC_API_KEY', placeholder:'sk-ant-...' },
                    { label:'OpenAI (GPT-4o fallback)', key:'OPENAI_API_KEY', placeholder:'sk-...' },
                    { label:'Paystack Secret Key', key:'PAYSTACK_SECRET_KEY', placeholder:'sk_live_...' },
                  ].map(k => (
                    <div key={k.key} className="flex gap-2">
                      <Input label={k.label} type="password" placeholder={k.placeholder} className="flex-1" />
                      <div className="pt-5"><Button variant="secondary" size="sm">Test</Button></div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  API keys are stored encrypted. Never share them. Rotate if compromised.
                </div>
                <Button variant="primary" onClick={save}>Save API Keys</Button>
              </Card>
            </>
          )}

          {active === 'Security' && (
            <>
              <h1 className="text-base font-semibold text-gray-900">Security</h1>
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Change Password</h2>
                <Input label="Current Password" type="password" placeholder="••••••••" />
                <Input label="New Password" type="password" placeholder="Min. 8 characters" />
                <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                <Button variant="primary">Update Password</Button>
              </Card>
              <Card className="p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-800">Active Sessions</h2>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-xs font-medium text-gray-700">Current session — Lagos, Nigeria</div>
                    <div className="text-[10px] text-gray-400">Chrome · Started just now</div>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Active</span>
                </div>
                <Button variant="danger" size="sm" className="w-full justify-center">Sign out all other sessions</Button>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
