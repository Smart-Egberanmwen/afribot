'use client'
import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTenants, useProducts, useInventoryReport, useInventoryAlerts, useCreateProduct, useRestock } from '@/hooks/use-api'
import { Card, StatusBadge, Skeleton, EmptyState } from '@/components/ui/primitives'
import { Button, Input, Textarea, Select, Modal } from '@/components/ui/forms'
import { formatNaira, formatRelative, cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'

// Works both as /inventory (agency view) and /clients/[id]/inventory
export default function InventoryView({ clientId: clientIdProp }: { clientId?: string }) {
  const clientId = clientIdProp || ''
  const [selectedTenant, setSelectedTenant] = useState(clientId)
  const [showAdd, setShowAdd] = useState(false)
  const [showRestock, setShowRestock] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState('')
  const [restockQty, setRestockQty] = useState('')

  const { data: tenantsData } = useTenants()
  const tenants = tenantsData?.data || []
  const activeTenant = selectedTenant || tenants[0]?.id || ''

  const { data: productsData, isLoading } = useProducts(activeTenant, { search })
  const { data: report } = useInventoryReport(activeTenant)
  const { data: alerts } = useInventoryAlerts(activeTenant)
  const createProduct = useCreateProduct(activeTenant)
  const restock = useRestock(activeTenant)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string; sku: string; description: string; priceNgn: number;
    trackInventory: boolean; initialStock: number; reorderPoint: number
  }>({ defaultValues: { trackInventory: true, initialStock: 0, reorderPoint: 10 } })

  const onAddProduct = handleSubmit(async (data) => {
    await createProduct.mutateAsync({ ...data, priceNgn: Number(data.priceNgn) * 100 })
    reset(); setShowAdd(false)
  })

  const onRestock = async () => {
    if (!showRestock || !restockQty) return
    await restock.mutateAsync({ productId: showRestock.id, quantity: Number(restockQty) })
    setShowRestock(null); setRestockQty('')
  }

  const products = productsData?.data || []
  const summary = report?.summary
  const lowAlerts = alerts || []

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Inventory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Real-time stock across all clients</p>
        </div>
        <div className="flex items-center gap-2">
          {!clientId && tenants.length > 0 && (
            <select value={activeTenant} onChange={e => setSelectedTenant(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-brand-400">
              <option value="">All clients</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-40 h-8 text-xs" />
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)} icon={<span>+</span>}>Add Product</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: summary?.totalProducts?.toLocaleString() || '—', color: 'text-gray-800' },
          { label: 'Low Stock', value: (summary?.lowStock || lowAlerts.length || 0).toString(), color: 'text-amber-600' },
          { label: 'Out of Stock', value: summary?.outOfStock?.toString() || '0', color: 'text-red-600' },
          { label: 'Stock Value', value: formatNaira(summary?.totalStockValueNgn || 0, true), color: 'text-brand-600' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={cn('text-2xl font-semibold', s.color)}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Low stock alerts */}
      {lowAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500">⚠</span>
            <span className="text-sm font-medium text-amber-800">{lowAlerts.length} items need restocking</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowAlerts.map((a: any) => (
              <button key={a.id} onClick={() => setShowRestock({ id: a.product_id, name: a.products?.name || 'Product' })}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-amber-200 text-xs hover:border-amber-400 transition-colors">
                <span className="text-amber-600 font-medium">{a.products?.name}</span>
                <span className="text-gray-400">({a.quantity_available} left)</span>
                <span className="text-brand-600">Restock →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Products ({productsData?.total || 0})</span>
          <div className="flex gap-1.5 text-[11px]">
            {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(f => (
              <button key={f} className="px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">{f}</button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : products.length === 0 ? (
          <EmptyState icon="📦" title="No products yet" description="Add your first product to start tracking inventory"
            action={<Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>Add product</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-400 bg-gray-50/80 border-b border-gray-100">
                  {['Product', 'SKU', 'Price', 'On Hand', 'Reserved', 'Available', 'Reorder At', ''].map(h => (
                    <th key={h} className="text-left font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const inv = p.inventory?.[0]
                  const available = inv?.quantityAvailable ?? inv?.quantity_available ?? 0
                  const onHand = inv?.quantityOnHand ?? inv?.quantity_on_hand ?? 0
                  const reorder = inv?.reorderPoint ?? inv?.reorder_point ?? 10
                  const isOut = available <= 0
                  const isLow = !isOut && available <= reorder
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {p.imageUrls?.[0] || p.image_urls?.[0] ? (
                            <img src={p.imageUrls?.[0] || p.image_urls?.[0]} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-800">{p.name}</div>
                            {p.description && <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{p.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">{formatNaira(p.priceNgn || p.price_ngn || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{onHand}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{inv?.quantityReserved ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-sm font-semibold', isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600')}>
                          {available}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{reorder}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline"
                          onClick={() => setShowRestock({ id: p.id, name: p.name })}>
                          Restock
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Product Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); reset() }} title="Add New Product" size="md"
        footer={<>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" loading={createProduct.isPending} onClick={onAddProduct}>Add Product</Button>
        </>}>
        <form onSubmit={onAddProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Product Name" placeholder="Jollof Rice (Large)" error={errors.name?.message} {...register('name', { required: 'Required' })} />
            <Input label="SKU (optional)" placeholder="JR-LG-001" {...register('sku')} />
          </div>
          <Textarea label="Description" rows={2} placeholder="Short product description..." {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₦)" type="number" placeholder="2500" prefix="₦" {...register('priceNgn', { required: 'Required' })} />
            <Input label="Initial Stock" type="number" placeholder="50" {...register('initialStock')} />
          </div>
          <Input label="Low-Stock Alert At" type="number" placeholder="10" hint="You'll be alerted when stock drops to this level" {...register('reorderPoint')} />
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal open={!!showRestock} onClose={() => { setShowRestock(null); setRestockQty('') }}
        title={`Restock: ${showRestock?.name}`}
        footer={<>
          <Button variant="secondary" onClick={() => setShowRestock(null)}>Cancel</Button>
          <Button variant="primary" loading={restock.isPending} onClick={onRestock} disabled={!restockQty}>Add Stock</Button>
        </>}>
        <div className="space-y-4">
          <Input label="Quantity to Add" type="number" placeholder="50" value={restockQty}
            onChange={e => setRestockQty(e.target.value)} autoFocus />
          <p className="text-xs text-gray-500">This will be recorded as a restock movement in inventory history.</p>
        </div>
      </Modal>
    </div>
  )
}
