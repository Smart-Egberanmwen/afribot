'use client'
import { useState } from 'react'
import { useTenants, useOrders, useUpdateOrderStatus } from '@/hooks/use-api'
import { Card, StatusBadge, Skeleton, EmptyState } from '@/components/ui/primitives'
import { Button, Modal } from '@/components/ui/forms'
import { formatNaira, formatDate, formatRelative, cn } from '@/lib/utils'

const ORDER_STATUSES = ['all', 'pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled']
const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed', confirmed: 'processing', processing: 'ready', ready: 'delivered'
}

const MOCK_ORDERS = [
  { id:'1', orderNumber:'ORD-0527-0023', tenant:'Mama Tee Kitchen', status:'pending', paymentStatus:'paid', totalNgn:630000, createdAt:new Date(Date.now()-180000).toISOString(), contacts:{name:'Amara Kalu',whatsappNumber:'+2349012345678'}, orderItems:[{productName:'Jollof Rice',quantity:2,totalPriceNgn:480000},{productName:'Delivery Fee',quantity:1,totalPriceNgn:150000}] },
  { id:'2', orderNumber:'ORD-0527-0022', tenant:'Mama Tee Kitchen', status:'confirmed', paymentStatus:'paid', totalNgn:420000, createdAt:new Date(Date.now()-1200000).toISOString(), contacts:{name:'Tunde Eze',whatsappNumber:'+2348023456789'}, orderItems:[{productName:'Ofada Rice',quantity:1,totalPriceNgn:270000},{productName:'Fried Fish',quantity:1,totalPriceNgn:150000}] },
  { id:'3', orderNumber:'ORD-0527-0021', tenant:'Lagos Styles', status:'processing', paymentStatus:'paid', totalNgn:1850000, createdAt:new Date(Date.now()-3600000).toISOString(), contacts:{name:'Ngozi Adeyemi',whatsappNumber:'+2347034567890'}, orderItems:[{productName:'Ankara Wrap Dress (M)',quantity:1,totalPriceNgn:1850000}] },
  { id:'4', orderNumber:'ORD-0527-0020', tenant:'TechFix', status:'ready', paymentStatus:'paid', totalNgn:2500000, createdAt:new Date(Date.now()-7200000).toISOString(), contacts:{name:'Emeka Obi',whatsappNumber:'+2348045678901'}, orderItems:[{productName:'iPhone 14 Screen Replacement',quantity:1,totalPriceNgn:2500000}] },
  { id:'5', orderNumber:'ORD-0527-0019', tenant:'Mama Tee Kitchen', status:'delivered', paymentStatus:'paid', totalNgn:380000, createdAt:new Date(Date.now()-86400000).toISOString(), contacts:{name:'Fatima Sule',whatsappNumber:'+2349056789012'}, orderItems:[{productName:'Egusi Soup + Garri',quantity:1,totalPriceNgn:380000}] },
  { id:'6', orderNumber:'ORD-0527-0018', tenant:'Lagos Styles', status:'cancelled', paymentStatus:'failed', totalNgn:950000, createdAt:new Date(Date.now()-172800000).toISOString(), contacts:{name:'Tobi Adebayo',whatsappNumber:'+2348067890123'}, orderItems:[{productName:'Aso-oke Set',quantity:1,totalPriceNgn:950000}] },
]

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [tenantFilter, setTenantFilter] = useState('')
  const [selected, setSelected] = useState<typeof MOCK_ORDERS[0] | null>(null)

  const { data: tenantsData } = useTenants()
  const tenants = tenantsData?.data || []

  const filtered = MOCK_ORDERS.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (tenantFilter && o.tenant !== tenantFilter) return false
    return true
  })

  const todayRevenue = MOCK_ORDERS.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.totalNgn, 0)
  const pendingCount = MOCK_ORDERS.filter(o => o.status === 'pending').length
  const todayCount = MOCK_ORDERS.length

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">All orders across clients · Auto-created by AI</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">Export CSV</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: formatNaira(todayRevenue, true), color: 'text-brand-600' },
          { label: 'Total Orders', value: todayCount.toString(), color: 'text-gray-800' },
          { label: 'Pending', value: pendingCount.toString(), color: 'text-amber-600' },
          { label: 'Avg Order Value', value: formatNaira(Math.round(todayRevenue / todayCount), true), color: 'text-gray-800' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={cn('text-2xl font-semibold', s.color)}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {ORDER_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('text-[11px] px-2.5 py-1 rounded-full capitalize transition-colors',
                statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              )}>
              {s} {s !== 'all' ? `(${MOCK_ORDERS.filter(o => o.status === s).length})` : ''}
            </button>
          ))}
        </div>
        <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)}
          className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-400 ml-auto">
          <option value="">All clients</option>
          {Array.from(new Set(MOCK_ORDERS.map(o => o.tenant))).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80 border-b border-gray-100">
              {['Order #', 'Customer', 'Client', 'Items', 'Total', 'Payment', 'Status', 'Time', ''].map(h => (
                <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelected(order)}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{order.orderNumber}</td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-gray-800">{order.contacts.name}</div>
                  <div className="text-[10px] text-gray-400">{order.contacts.whatsappNumber}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{order.tenant}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{order.orderItems.length} item{order.orderItems.length > 1 ? 's' : ''}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatNaira(order.totalNgn)}</td>
                <td className="px-4 py-3"><StatusBadge status={order.paymentStatus} /></td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelected(order) }}>View</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNumber}`} size="md"
        footer={
          selected && STATUS_FLOW[selected.status] ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="primary">
                Mark as {STATUS_FLOW[selected.status].charAt(0).toUpperCase() + STATUS_FLOW[selected.status].slice(1)}
              </Button>
            </>
          ) : <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
        }>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-semibold text-gray-900">{selected.contacts.name}</div>
                <div className="text-sm text-gray-500">{selected.contacts.whatsappNumber} · {selected.tenant}</div>
              </div>
              <div className="ml-auto flex gap-2">
                <StatusBadge status={selected.paymentStatus} />
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</div>
              {selected.orderItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm text-gray-800">{item.productName}</div>
                    <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{formatNaira(item.totalPriceNgn)}</div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-semibold text-gray-800">Total</span>
                <span className="text-lg font-bold text-brand-600">{formatNaira(selected.totalNgn)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400">Created {formatDate(selected.createdAt)} · Order processed by AI</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
