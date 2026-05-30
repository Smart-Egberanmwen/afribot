import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  tenantsApi, conversationsApi, contactsApi,
  inventoryApi, ordersApi, analyticsApi, aiApi,
} from '@/lib/api'
import toast from 'react-hot-toast'

// ── Tenants ──────────────────────────────────────────
export function useAgencyOverview() {
  return useQuery({
    queryKey: ['agency-overview'],
    queryFn: () => tenantsApi.overview().then(r => r.data),
    refetchInterval: 30_000,
  })
}

export function useTenants(params?: any) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => tenantsApi.list(params).then(r => r.data),
  })
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id).then(r => r.data),
    enabled: !!id,
  })
}

export function useTenantStats(id: string) {
  return useQuery({
    queryKey: ['tenant-stats', id],
    queryFn: () => tenantsApi.stats(id).then(r => r.data),
    enabled: !!id,
    refetchInterval: 60_000,
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => tenantsApi.create(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['agency-overview'] })
      toast.success('Client created!')
    },
  })
}

export function useUpdateTenant(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => tenantsApi.update(id, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant', id] })
      toast.success('Client updated')
    },
  })
}

// ── Conversations ─────────────────────────────────────
export function useConversations(tenantId: string, params?: any) {
  return useQuery({
    queryKey: ['conversations', tenantId, params],
    queryFn: () => conversationsApi.list(tenantId, params).then(r => r.data),
    enabled: !!tenantId,
    refetchInterval: 10_000,
  })
}

export function useMessages(tenantId: string, convId: string) {
  return useQuery({
    queryKey: ['messages', convId],
    queryFn: () => conversationsApi.messages(tenantId, convId).then(r => r.data),
    enabled: !!convId,
    refetchInterval: 5_000,
  })
}

// ── Contacts ─────────────────────────────────────────
export function useContacts(tenantId: string, params?: any) {
  return useQuery({
    queryKey: ['contacts', tenantId, params],
    queryFn: () => contactsApi.list(tenantId, params).then(r => r.data),
    enabled: !!tenantId,
  })
}

// ── Inventory ─────────────────────────────────────────
export function useProducts(tenantId: string, params?: any) {
  return useQuery({
    queryKey: ['products', tenantId, params],
    queryFn: () => inventoryApi.products(tenantId, params).then(r => r.data),
    enabled: !!tenantId,
  })
}

export function useInventoryReport(tenantId: string) {
  return useQuery({
    queryKey: ['inventory-report', tenantId],
    queryFn: () => inventoryApi.report(tenantId).then(r => r.data),
    enabled: !!tenantId,
  })
}

export function useInventoryAlerts(tenantId: string) {
  return useQuery({
    queryKey: ['inventory-alerts', tenantId],
    queryFn: () => inventoryApi.alerts(tenantId).then(r => r.data),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  })
}

export function useCreateProduct(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => inventoryApi.createProduct(tenantId, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', tenantId] })
      qc.invalidateQueries({ queryKey: ['inventory-report', tenantId] })
      toast.success('Product added!')
    },
  })
}

export function useRestock(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, quantity, notes }: { productId: string; quantity: number; notes?: string }) =>
      inventoryApi.restock(tenantId, productId, quantity, notes).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', tenantId] })
      qc.invalidateQueries({ queryKey: ['inventory-alerts', tenantId] })
      toast.success('Stock updated!')
    },
  })
}

// ── Orders ────────────────────────────────────────────
export function useOrders(tenantId: string, params?: any) {
  return useQuery({
    queryKey: ['orders', tenantId, params],
    queryFn: () => ordersApi.list(tenantId, params).then(r => r.data),
    enabled: !!tenantId,
    refetchInterval: 15_000,
  })
}

export function useOrder(tenantId: string, id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(tenantId, id).then(r => r.data),
    enabled: !!id,
  })
}

export function useUpdateOrderStatus(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(tenantId, id, status).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', tenantId] })
      toast.success('Order updated')
    },
  })
}

// ── Analytics ─────────────────────────────────────────
export function useAnalytics(tenantId: string, days = 30) {
  return useQuery({
    queryKey: ['analytics', tenantId, days],
    queryFn: () => analyticsApi.get(tenantId, days).then(r => r.data),
    enabled: !!tenantId,
  })
}

// ── AI ────────────────────────────────────────────────
export function useAIAgent(tenantId: string) {
  return useQuery({
    queryKey: ['ai-agent', tenantId],
    queryFn: () => aiApi.getAgent(tenantId).then(r => r.data),
    enabled: !!tenantId,
  })
}

export function useKnowledge(tenantId: string) {
  return useQuery({
    queryKey: ['knowledge', tenantId],
    queryFn: () => aiApi.getKnowledge(tenantId).then(r => r.data),
    enabled: !!tenantId,
  })
}

export function useUpdateAIAgent(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => aiApi.updateAgent(tenantId, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-agent', tenantId] })
      toast.success('AI agent saved!')
    },
  })
}

export function useAddKnowledge(tenantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => aiApi.addKnowledge(tenantId, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge', tenantId] })
      toast.success('Knowledge added!')
    },
  })
}
