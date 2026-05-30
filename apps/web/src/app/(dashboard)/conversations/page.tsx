'use client'
import { useState } from 'react'
import { useTenants } from '@/hooks/use-api'
import { Card, StatusBadge, LiveDot, EmptyState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/forms'
import { formatRelative, clientColor, cn } from '@/lib/utils'

const STATUSES = ['all', 'bot', 'open', 'handoff', 'pending', 'resolved']

// Mock multi-tenant conversation data
const MOCK_CONVS = [
  { id:'1', contact:'Amara Kalu', phone:'+2349012345678', tenant:'Mama Tee Kitchen', status:'bot', preview:'I want to order jollof rice for 4 people', time: new Date(Date.now()-180000).toISOString(), unread:2, ai:true },
  { id:'2', contact:'Babatunde Eze', phone:'+2348023456789', tenant:'Lagos Styles', status:'bot', preview:'Do you have the ankara dress in size 12?', time: new Date(Date.now()-300000).toISOString(), unread:1, ai:true },
  { id:'3', contact:'Fatima Okonkwo', phone:'+2347034567890', tenant:'TechFix', status:'handoff', preview:'URGENT: My phone data wiped after your repair!', time: new Date(Date.now()-600000).toISOString(), unread:3, ai:false },
  { id:'4', contact:'Chidi Nwosu', phone:'+2348045678901', tenant:'QuickFix Auto', status:'open', preview:'Good morning, I need car service booking', time: new Date(Date.now()-900000).toISOString(), unread:0, ai:true },
  { id:'5', contact:'Ngozi Adeyemi', phone:'+2349056789012', tenant:'Lagos Styles', status:'bot', preview:'Is my order ORD-0527-0021 ready?', time: new Date(Date.now()-1200000).toISOString(), unread:0, ai:true },
  { id:'6', contact:'Emeka Obi', phone:'+2347067890123', tenant:'Mama Tee Kitchen', status:'resolved', preview:'Thank you, food was delicious!', time: new Date(Date.now()-3600000).toISOString(), unread:0, ai:true },
  { id:'7', contact:'Aisha Suleiman', phone:'+2348078901234', tenant:'TechFix', status:'open', preview:'How long will screen replacement take?', time: new Date(Date.now()-4500000).toISOString(), unread:0, ai:true },
  { id:'8', contact:'Tobi Adebayo', phone:'+2349089012345', tenant:'QuickFix Auto', status:'handoff', preview:'Human please, need to speak with manager', time: new Date(Date.now()-5400000).toISOString(), unread:1, ai:false },
]

export default function ConversationsPage() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = MOCK_CONVS.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    if (search && !c.contact.toLowerCase().includes(search.toLowerCase()) && !c.preview.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = s === 'all' ? MOCK_CONVS.length : MOCK_CONVS.filter(c => c.status === s).length
    return acc
  }, {} as Record<string, number>)

  const handoffs = MOCK_CONVS.filter(c => c.status === 'handoff').length

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left panel */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Search + filter */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-brand-400 transition-all"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3"/><path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={cn('flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full capitalize transition-colors',
                  filter === s ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}>
                {s} {counts[s] > 0 ? `(${counts[s]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Handoff alert */}
        {handoffs > 0 && (
          <div className="mx-3 mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
            <span className="text-orange-500 text-sm">⚡</span>
            <span className="text-xs text-orange-700 font-medium">{handoffs} conversation{handoffs > 1 ? 's' : ''} need handoff</span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No conversations found</div>
          ) : filtered.map((conv, i) => {
            const color = clientColor(['Mama Tee Kitchen','Lagos Styles','TechFix','QuickFix Auto'].indexOf(conv.tenant))
            return (
              <div key={conv.id} onClick={() => setSelected(conv.id)}
                className={cn('flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b border-gray-50 transition-colors',
                  selected === conv.id ? 'bg-brand-50 border-l-2 border-l-brand-600' : 'hover:bg-gray-50'
                )}>
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0 mt-0.5">
                  {conv.contact.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-gray-800">{conv.contact}</span>
                    <span className="text-[10px] text-gray-400">{formatRelative(conv.time)}</span>
                  </div>
                  <div className={cn('text-[11px] px-1.5 py-0.5 rounded text-[10px] inline-block mb-1', color.bg, color.text)}>{conv.tenant}</div>
                  <span className="ml-1 text-[9px] text-gray-400">{conv.phone.startsWith('email:') ? '📧' : '📱'}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate">{conv.preview}</span>
                    {conv.unread > 0 && (
                      <span className="ml-1 w-4 h-4 flex-shrink-0 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-bold">{conv.unread}</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusBadge status={conv.status} className="text-[9px] py-0.5" />
                    {conv.ai && <span className="text-[9px] text-purple-500 bg-purple-50 px-1 rounded">AI</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer stats */}
        <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><LiveDot />{MOCK_CONVS.filter(c => c.status !== 'resolved').length} active</div>
          <span className="text-emerald-600 font-medium">AI: 78%</span>
        </div>
      </div>

      {/* Right: message view */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selected ? (
          <ConversationView conv={MOCK_CONVS.find(c => c.id === selected)!} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon="💬" title="Select a conversation" description="Pick one from the list to read messages and reply" />
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationView({ conv }: { conv: typeof MOCK_CONVS[0] }) {
  const [reply, setReply] = useState('')
  const messages = [
    { dir: 'in', text: conv.preview, time: conv.time, ai: false },
    { dir: 'out', text: "Hello! 👋 Thanks for reaching out. How can I help you today?", time: new Date(Date.now()-120000).toISOString(), ai: true },
    { dir: 'in', text: "I need more details please", time: new Date(Date.now()-60000).toISOString(), ai: false },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
          {conv.contact.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-gray-900 text-sm">{conv.contact}</div>
          <div className="text-xs text-gray-400">{conv.phone} · {conv.tenant}</div>
        </div>
        <StatusBadge status={conv.status} />
        {conv.status === 'handoff' && (
          <Button size="sm" variant="primary">Assign to me</Button>
        )}
        <Button size="sm" variant="secondary">Resolve</Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.dir === 'out' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-sm rounded-2xl px-4 py-2.5 text-sm',
              m.dir === 'out' ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white text-gray-800 shadow-card rounded-bl-sm'
            )}>
              <p>{m.text}</p>
              <div className={cn('flex items-center gap-1.5 mt-1', m.dir === 'out' ? 'justify-end' : 'justify-start')}>
                <span className={cn('text-[10px]', m.dir === 'out' ? 'text-white/60' : 'text-gray-400')}>{formatRelative(m.time)}</span>
                {m.ai && <span className={cn('text-[9px] px-1 rounded', m.dir === 'out' ? 'bg-white/20 text-white/70' : 'bg-purple-100 text-purple-600')}>AI</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex gap-2 items-end">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
            placeholder="Type reply (this bypasses AI and sends as staff)..."
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl resize-none outline-none focus:border-brand-400"
          />
          <Button variant="primary" disabled={!reply.trim()} onClick={() => setReply('')}>Send</Button>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          <button className="hover:text-brand-600 transition-colors">🤖 Let AI reply</button>
          <button className="hover:text-orange-600 text-orange-500 transition-colors">⚡ Request handoff</button>
          <button className="hover:text-gray-600 transition-colors">✓ Mark resolved</button>
        </div>
      </div>
    </div>
  )
}
