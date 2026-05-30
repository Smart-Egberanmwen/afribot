'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTenant, useAIAgent, useKnowledge, useUpdateAIAgent, useAddKnowledge } from '@/hooks/use-api'
import { Card } from '@/components/ui/primitives'
import { Button, Input, Textarea, Select, Toggle, Modal } from '@/components/ui/forms'
import { cn } from '@/lib/utils'

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic) — Recommended' },
  { value: 'gpt4o', label: 'GPT-4o (OpenAI)' },
  { value: 'grok', label: 'Grok (xAI)' },
]

const DOC_TYPES = [
  { value: 'faq', label: 'FAQ / Q&A' },
  { value: 'product', label: 'Product Info' },
  { value: 'policy', label: 'Policy / Terms' },
  { value: 'custom', label: 'Custom Content' },
]

export default function AIAgentPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { data: tenant } = useTenant(clientId)
  const { data: agent, isLoading } = useAIAgent(clientId)
  const { data: knowledge } = useKnowledge(clientId)
  const updateAgent = useUpdateAIAgent(clientId)
  const addKnowledge = useAddKnowledge(clientId)

  const [form, setForm] = useState<any>({})
  const [showAddDoc, setShowAddDoc] = useState(false)
  const [docForm, setDocForm] = useState({ title: '', content: '', docType: 'faq' })
  const [activeSection, setActiveSection] = useState('identity')

  useEffect(() => {
    if (agent) setForm(agent)
  }, [agent])

  const handleSave = () => updateAgent.mutate(form)

  const handleAddDoc = async () => {
    await addKnowledge.mutateAsync(docForm)
    setDocForm({ title: '', content: '', docType: 'faq' })
    setShowAddDoc(false)
  }

  const sections = [
    { id: 'identity', label: 'Identity & Persona' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'advanced', label: 'Advanced' },
  ]

  return (
    <div className="flex h-full animate-fade-in">
      {/* Section nav */}
      <div className="w-48 border-r border-gray-200 bg-white p-3 flex-shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-2">Configuration</div>
        <nav className="space-y-0.5">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                activeSection === s.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 px-2">
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg',
            agent?.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', agent?.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
            {agent?.isActive ? 'Agent Active' : 'Agent Paused'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">AI Agent — {tenant?.name}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Powered by {form.primaryProvider || 'claude'} · RAG knowledge base</p>
            </div>
            <Button variant="primary" loading={updateAgent.isPending} onClick={handleSave}>
              Save Changes
            </Button>
          </div>

          {/* Identity section */}
          {activeSection === 'identity' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Agent Identity</h2>
                <Input
                  label="Agent Name"
                  placeholder="e.g. Tee Bot, StyleBot, AutoAssist"
                  value={form.name || ''}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
                <Textarea
                  label="Persona Description"
                  rows={3}
                  placeholder="e.g. Friendly and professional Nigerian customer service agent who knows everything about our restaurant..."
                  value={form.persona || ''}
                  onChange={e => setForm({ ...form, persona: e.target.value })}
                />
                <Textarea
                  label="Welcome Message"
                  rows={3}
                  placeholder="The first message sent when a new customer messages you..."
                  hint="Use variables: {customer_name}, {business_name}"
                  value={form.welcomeMessage || ''}
                  onChange={e => setForm({ ...form, welcomeMessage: e.target.value })}
                />
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">System Prompt</h2>
                <Textarea
                  label="Master System Prompt"
                  rows={12}
                  placeholder="You are a helpful assistant for [Business Name]..."
                  hint="This is the core instruction set for your AI. Be specific about your business, products, and how you want the AI to behave."
                  value={form.systemPrompt || ''}
                  onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
                  className="font-mono text-xs"
                />

                {/* Prompt templates */}
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Quick Templates:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Restaurant', prompt: `You are a friendly AI assistant for {business_name}, a Nigerian restaurant. You help customers view our menu, take orders, process payments via Paystack, and track deliveries. Always be warm and professional. When taking orders, confirm items and prices before generating a payment link. If customers have complaints, empathize first then offer solutions.` },
                      { label: 'Retail Shop', prompt: `You are a helpful shopping assistant for {business_name}. You help customers browse products, check availability, take orders, and arrange delivery or pickup. Be friendly and knowledgeable about our product catalog. Generate payment links using Paystack for confirmed orders.` },
                      { label: 'Services', prompt: `You are a professional assistant for {business_name}. You help clients inquire about services, get quotes, book appointments, and answer FAQs. Collect client details (name, contact, service needed) and schedule accordingly. For complex inquiries, offer to connect them with a team member.` },
                    ].map(t => (
                      <button
                        key={t.label}
                        onClick={() => setForm({ ...form, systemPrompt: t.prompt })}
                        className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-brand-50 hover:text-brand-700 rounded-lg border border-gray-200 transition-colors"
                      >
                        {t.label} template
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Capabilities section */}
          {activeSection === 'capabilities' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="p-5 space-y-5">
                <h2 className="text-sm font-semibold text-gray-800">Bot Capabilities</h2>
                <p className="text-xs text-gray-500">Enable what this AI agent can do for customers.</p>

                {[
                  { key: 'enableOrderTaking', label: 'Order Taking', desc: 'AI can receive product orders, build cart, and confirm orders' },
                  { key: 'enablePaymentLinks', label: 'Payment Link Generation', desc: 'Auto-generate Paystack payment links after order confirmation' },
                  { key: 'enableAppointmentBooking', label: 'Appointment Booking', desc: 'Allow customers to book appointments or services' },
                  { key: 'enableLeadQualification', label: 'Lead Qualification', desc: 'Collect name, email, and needs from potential customers' },
                ].map(cap => (
                  <div key={cap.key} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-700">{cap.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{cap.desc}</div>
                    </div>
                    <Toggle
                      checked={!!form[cap.key]}
                      onChange={v => setForm({ ...form, [cap.key]: v })}
                    />
                  </div>
                ))}
              </Card>

              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Human Handoff</h2>
                <Input
                  label="Handoff Keywords"
                  placeholder="human, agent, staff, help, manager"
                  hint="Comma-separated. When customer types these, AI will request handoff."
                  value={(form.handoffKeywords || []).join(', ')}
                  onChange={e => setForm({ ...form, handoffKeywords: e.target.value.split(',').map((k: string) => k.trim()) })}
                />
                <Input
                  label="Escalation Threshold"
                  type="number"
                  hint="Number of failed AI responses before auto-escalating to human"
                  value={form.escalationThreshold || 3}
                  onChange={e => setForm({ ...form, escalationThreshold: parseInt(e.target.value) })}
                />
                <Textarea
                  label="Out-of-Hours Message"
                  rows={3}
                  placeholder="We're currently closed. Our working hours are 8am-8pm Lagos time. We'll respond first thing tomorrow! 🌙"
                  value={form.outOfHoursMessage || ''}
                  onChange={e => setForm({ ...form, outOfHoursMessage: e.target.value })}
                />
              </Card>
            </div>
          )}

          {/* Knowledge Base section */}
          {activeSection === 'knowledge' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Knowledge Base (RAG)</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Add FAQs, product info, and policies. The AI uses this for accurate responses.</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowAddDoc(true)}>+ Add Document</Button>
              </div>

              {(!knowledge || knowledge.length === 0) ? (
                <Card className="p-8 text-center">
                  <div className="text-2xl mb-2">📚</div>
                  <div className="text-sm font-medium text-gray-600">No knowledge documents yet</div>
                  <div className="text-xs text-gray-400 mt-1 mb-4">Add FAQs, product descriptions, and policies to improve AI accuracy</div>
                  <Button variant="primary" size="sm" onClick={() => setShowAddDoc(true)}>Add first document</Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {knowledge.map((doc: any) => (
                    <Card key={doc.id} className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base">
                        {doc.docType === 'faq' ? '❓' : doc.docType === 'product' ? '📦' : doc.docType === 'policy' ? '📋' : '📄'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{doc.title}</div>
                        <div className="text-xs text-gray-400">{doc.docType} · {doc.chunkCount || 0} chunks</div>
                      </div>
                      <div className={cn('w-2 h-2 rounded-full', doc.isActive ? 'bg-emerald-500' : 'bg-gray-300')} />
                      <Button size="sm" variant="ghost" className="text-red-500">Delete</Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advanced section */}
          {activeSection === 'advanced' && (
            <div className="space-y-4 animate-fade-in">
              <Card className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">AI Provider Settings</h2>
                <Select
                  label="Primary AI Provider"
                  options={PROVIDERS}
                  value={form.primaryProvider || 'claude'}
                  onChange={e => setForm({ ...form, primaryProvider: e.target.value })}
                />
                <Select
                  label="Fallback Provider"
                  options={PROVIDERS}
                  value={form.fallbackProvider || 'gpt4o'}
                  onChange={e => setForm({ ...form, fallbackProvider: e.target.value })}
                />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    Temperature: {form.temperature || 0.3}
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={form.temperature || 0.3}
                    onChange={e => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-brand-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Focused (0)</span>
                    <span>Creative (1)</span>
                  </div>
                </div>
                <Input
                  label="Max Response Tokens"
                  type="number"
                  value={form.maxResponseTokens || 500}
                  onChange={e => setForm({ ...form, maxResponseTokens: parseInt(e.target.value) })}
                  hint="Longer = more detailed but slower. 300-600 recommended for WhatsApp."
                />
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Agent Status</div>
                    <div className="text-xs text-gray-400 mt-0.5">Disable to pause AI and route all messages to staff</div>
                  </div>
                  <Toggle
                    checked={!!form.isActive}
                    onChange={v => setForm({ ...form, isActive: v })}
                    label={form.isActive ? 'Active' : 'Paused'}
                  />
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Knowledge Modal */}
      <Modal
        open={showAddDoc}
        onClose={() => setShowAddDoc(false)}
        title="Add Knowledge Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddDoc(false)}>Cancel</Button>
            <Button variant="primary" loading={addKnowledge.isPending} onClick={handleAddDoc}>Add Document</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Document Title" placeholder="e.g. Our Menu & Prices" value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} />
          <Select label="Document Type" options={DOC_TYPES} value={docForm.docType} onChange={e => setDocForm({ ...docForm, docType: e.target.value })} />
          <Textarea
            label="Content"
            rows={10}
            placeholder="Paste your FAQs, product list, menu, policies, or any content the AI should know about..."
            hint="Write naturally. Q&A format works great for FAQs. The AI will use this to answer customer questions accurately."
            value={docForm.content}
            onChange={e => setDocForm({ ...docForm, content: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
