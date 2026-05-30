import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('afribot_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle errors globally
api.interceptors.response.use(
  (res) => res.data?.data !== undefined ? { ...res, data: res.data.data } : res,
  (err: AxiosError<any>) => {
    const msg = err.response?.data?.message || err.message || 'Something went wrong'
    if (err.response?.status === 401) {
      localStorage.removeItem('afribot_token')
      window.location.href = '/login'
    } else if (err.response?.status !== 404) {
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// Typed API functions
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post<{ accessToken: string; user: User }>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
}

export const tenantsApi = {
  list: (params?: any) => api.get<PaginatedResponse<Tenant>>('/tenants', { params }),
  overview: () => api.get<AgencyOverview>('/tenants/agency-overview'),
  get: (id: string) => api.get<Tenant>(`/tenants/${id}`),
  stats: (id: string) => api.get<TenantStats>(`/tenants/${id}/stats`),
  create: (data: Partial<Tenant>) => api.post<Tenant>('/tenants', data),
  update: (id: string, data: Partial<Tenant>) => api.put<Tenant>(`/tenants/${id}`, data),
  addWhatsApp: (id: string, data: any) => api.post(`/tenants/${id}/whatsapp-accounts`, data),
}

export const conversationsApi = {
  list: (tenantId: string, params?: any) =>
    api.get<PaginatedResponse<Conversation>>(`/tenants/${tenantId}/conversations`, { params }),
  messages: (tenantId: string, convId: string) =>
    api.get<Message[]>(`/tenants/${tenantId}/conversations/${convId}/messages`),
  handoff: (tenantId: string, convId: string, agentId: string) =>
    api.post(`/tenants/${tenantId}/conversations/${convId}/handoff`, { agentId }),
  resolve: (tenantId: string, convId: string) =>
    api.post(`/tenants/${tenantId}/conversations/${convId}/resolve`),
}

export const contactsApi = {
  list: (tenantId: string, params?: any) =>
    api.get<PaginatedResponse<Contact>>(`/tenants/${tenantId}/contacts`, { params }),
  get: (tenantId: string, id: string) =>
    api.get<Contact>(`/tenants/${tenantId}/contacts/${id}`),
  update: (tenantId: string, id: string, data: Partial<Contact>) =>
    api.put<Contact>(`/tenants/${tenantId}/contacts/${id}`, data),
}

export const inventoryApi = {
  products: (tenantId: string, params?: any) =>
    api.get<PaginatedResponse<Product>>(`/tenants/${tenantId}/inventory/products`, { params }),
  createProduct: (tenantId: string, data: Partial<Product>) =>
    api.post<Product>(`/tenants/${tenantId}/inventory/products`, data),
  updateProduct: (tenantId: string, productId: string, data: Partial<Product>) =>
    api.put<Product>(`/tenants/${tenantId}/inventory/products/${productId}`, data),
  report: (tenantId: string) =>
    api.get<InventoryReport>(`/tenants/${tenantId}/inventory/report`),
  alerts: (tenantId: string) =>
    api.get<any[]>(`/tenants/${tenantId}/inventory/alerts`),
  restock: (tenantId: string, productId: string, quantity: number, notes?: string) =>
    api.post(`/tenants/${tenantId}/inventory/restock`, { productId, quantity, notes }),
}

export const ordersApi = {
  list: (tenantId: string, params?: any) =>
    api.get<PaginatedResponse<Order>>(`/tenants/${tenantId}/orders`, { params }),
  get: (tenantId: string, id: string) =>
    api.get<Order>(`/tenants/${tenantId}/orders/${id}`),
  updateStatus: (tenantId: string, id: string, status: string) =>
    api.put(`/tenants/${tenantId}/orders/${id}/status`, { status }),
}

export const analyticsApi = {
  get: (tenantId: string, days?: number) =>
    api.get<AnalyticsData>(`/tenants/${tenantId}/analytics`, { params: { days } }),
}

export const aiApi = {
  getAgent: (tenantId: string) => api.get<AIAgent>(`/tenants/${tenantId}/ai/agent`),
  updateAgent: (tenantId: string, data: Partial<AIAgent>) =>
    api.put<AIAgent>(`/tenants/${tenantId}/ai/agent`, data),
  getKnowledge: (tenantId: string) => api.get<KnowledgeDoc[]>(`/tenants/${tenantId}/ai/knowledge`),
  addKnowledge: (tenantId: string, data: any) =>
    api.post<KnowledgeDoc>(`/tenants/${tenantId}/ai/knowledge`, data),
}

// Types
export interface User {
  id: string
  email: string
  fullName: string
  role: 'super_admin' | 'agency_admin' | 'client_admin' | 'client_viewer'
  tenantId?: string
}

export interface Tenant {
  id: string
  slug: string
  name: string
  businessType?: string
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
  subscriptionPlan: 'starter' | 'growth' | 'pro' | 'enterprise'
  monthlyFeeNgn: number
  createdAt: string
  whatsappAccounts?: WhatsAppAccount[]
}

export interface WhatsAppAccount {
  id: string
  phoneNumber: string
  displayName: string
  isActive: boolean
  qualityRating: string
}

export interface TenantStats {
  totalContacts: number
  openConversations: number
  totalRevenueNgn: number
}

export interface AgencyOverview {
  totalClients: number
  activeClients: number
  monthlyRecurringRevenueNgn: number
  todayMessages: number
  todayOrderRevenueNgn: number
  clients: Tenant[]
}

export interface Conversation {
  id: string
  status: 'bot' | 'open' | 'handoff' | 'resolved' | 'pending'
  createdAt: string
  updatedAt: string
  contacts?: { name: string; whatsappNumber: string }
  messages?: Message[]
}

export interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  type: string
  content: string
  aiGenerated: boolean
  sentAt: string
  deliveredAt?: string
  readAt?: string
}

export interface Contact {
  id: string
  whatsappNumber: string
  name: string
  email?: string
  tags: string[]
  totalOrders: number
  totalSpentNgn: number
  lastInteractionAt: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  description?: string
  priceNgn: number
  categoryId?: string
  isActive: boolean
  imageUrls: string[]
  inventory?: { quantityOnHand: number; quantityAvailable: number; reorderPoint: number }[]
}

export interface InventoryReport {
  summary: { totalProducts: number; outOfStock: number; lowStock: number; totalStockValueNgn: number }
  items: any[]
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  totalNgn: number
  createdAt: string
  contacts?: { name: string; whatsappNumber: string }
  orderItems?: any[]
}

export interface AnalyticsData {
  summary: {
    totalRevenueNgn: number
    totalOrders: number
    completedOrders: number
    conversionRate: number
    totalMessages: number
    inboundMessages: number
    avgOrderValueNgn: number
  }
  dailyData: any[]
}

export interface AIAgent {
  id: string
  name: string
  persona: string
  systemPrompt: string
  primaryProvider: string
  enableOrderTaking: boolean
  enablePaymentLinks: boolean
  enableAppointmentBooking: boolean
  welcomeMessage: string
  isActive: boolean
}

export interface KnowledgeDoc {
  id: string
  title: string
  docType: string
  isActive: boolean
  chunkCount: number
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
