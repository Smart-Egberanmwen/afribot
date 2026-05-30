'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useTenants, useCreateTenant } from '@/hooks/use-api'
import { Card, StatusBadge, Skeleton, EmptyState, Avatar } from '@/components/ui/primitives'
import { Button, Input, Select, Modal } from '@/components/ui/forms'
import { formatNaira, slugify, clientColor, cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'

const PLANS = [
  { value: 'starter', label: 'Starter — ₦15,000/mo' },
  { value: 'growth', label: 'Growth — ₦25,000/mo' },
  { value: 'pro', label: 'Pro — ₦45,000/mo' },
  { value: 'enterprise', label: 'Enterprise — Custom' },
]

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant / Food' },
  { value: 'retail', label: 'Retail / Fashion' },
  { value: 'electronics', label: 'Electronics / Tech' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
]

export default function ClientsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useTenants()
  const createTenant = useCreateTenant()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<{
    name: string; slug: string; businessType: string; subscriptionPlan: string; monthlyFeeNgn: number
  }>({
    defaultValues: { subscriptionPlan: 'starter', monthlyFeeNgn: 15000, businessType: 'retail' }
  })

  const nameValue = watch('name')

  const onSubmit = handleSubmit(async (data) => {
    await createTenant.mutateAsync({ ...data, monthlyFeeNgn: Number(data.monthlyFeeNgn) * 100 })
    reset()
    setShowAdd(false)
  })

  const clients = data?.data || []
  const filtered = clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  const planFees: Record<string, number> = { starter: 15000, growth: 25000, pro: 45000, enterprise: 0 }

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Client Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {clients.length} clients · MRR {formatNaira(clients.reduce((s, c) => s + (c.monthlyFeeNgn || 0), 0), true)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="w-44 h-8 text-xs" />
          <Button variant="primary" onClick={() => setShowAdd(true)} icon={<span>+</span>}>
            Add Client
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-10 w-10 rounded-xl mb-3" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No clients yet"
          description="Add your first business client to get started"
          action={<Button variant="primary" onClick={() => setShowAdd(true)}>Add first client</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client, i) => (
            <ClientCard key={client.id} client={client} index={i} />
          ))}

          {/* Add new card */}
          <button
            onClick={() => setShowAdd(true)}
            className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 hover:border-brand-400 hover:bg-brand-50/30 transition-all min-h-[180px] group"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-300 group-hover:border-brand-400 flex items-center justify-center text-gray-400 group-hover:text-brand-600 text-xl transition-colors">
              +
            </div>
            <div className="text-sm font-medium text-gray-500 group-hover:text-brand-600 transition-colors">Add New Client</div>
            <div className="text-xs text-gray-400">Connect WhatsApp · Configure AI · Go live</div>
          </button>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); reset() }}
        title="Add New Client"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" loading={createTenant.isPending} onClick={onSubmit}>Create Client</Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Business Name"
            placeholder="e.g. Mama Tee Kitchen"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              onChange: (e) => setValue('slug', slugify(e.target.value))
            })}
          />
          <Input
            label="Slug (URL identifier)"
            placeholder="mama-tee-kitchen"
            hint="Unique identifier — auto-generated from name"
            {...register('slug', { required: true })}
          />
          <Select
            label="Business Type"
            options={BUSINESS_TYPES}
            {...register('businessType')}
          />
          <Select
            label="Subscription Plan"
            options={PLANS}
            {...register('subscriptionPlan', {
              onChange: (e) => setValue('monthlyFeeNgn', planFees[e.target.value] || 0)
            })}
          />
          <Input
            label="Monthly Fee (₦)"
            type="number"
            prefix="₦"
            placeholder="15000"
            hint="Amount you charge this client per month"
            {...register('monthlyFeeNgn', { valueAsNumber: true })}
          />
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <strong>Next steps after creating:</strong> You'll need to connect their WhatsApp Business number and configure the AI agent in the client workspace.
          </div>
        </form>
      </Modal>
    </div>
  )
}

function ClientCard({ client, index }: { client: any; index: number }) {
  const color = clientColor(index)
  const isTrial = client.status === 'trial'
  const initials = client.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Card className="p-5 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold', color.bg, color.text)}>
            {initials}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-[14px]">{client.name}</div>
            <div className="text-xs text-gray-400 capitalize">{client.businessType || client.business_type || 'Business'}</div>
          </div>
        </div>
        <StatusBadge status={client.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Revenue', value: formatNaira(client.totalRevenueNgn || 0, true) },
          { label: 'Plan', value: (client.subscriptionPlan || client.subscription_plan || 'starter').charAt(0).toUpperCase() + (client.subscriptionPlan || client.subscription_plan || 'starter').slice(1) },
          { label: 'Fee/mo', value: formatNaira(client.monthlyFeeNgn || client.monthly_fee_ngn || 0, true) },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-[13px] font-semibold text-gray-800">{stat.value}</div>
            <div className="text-[10px] text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/clients/${client.id}`} className="flex-1">
          <Button variant="primary" size="sm" className="w-full justify-center">Open Workspace</Button>
        </Link>
        <Link href={`/clients/${client.id}/ai-agent`}>
          <Button variant="secondary" size="sm" className="px-2.5" title="Configure AI">🤖</Button>
        </Link>
      </div>

      {isTrial && (
        <div className="mt-2.5 text-center text-[10px] text-amber-600 bg-amber-50 rounded-lg py-1.5">
          Trial — upgrade to go live
        </div>
      )}
    </Card>
  )
}
