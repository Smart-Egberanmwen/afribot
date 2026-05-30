import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async findAll(filters: { status?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20, status } = filters;

    let query = this.supabase.client
      .from('tenants')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return { data: data || [], total: count || 0, page, limit };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.client
      .from('tenants')
      .select(`
        *,
        whatsapp_accounts(*),
        ai_agents(id, name, is_active, primary_provider)
      `)
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Tenant ${id} not found`);
    return data;
  }

  async create(dto: {
    name: string;
    slug: string;
    businessType?: string;
    subscriptionPlan?: string;
    monthlyFeeNgn?: number;
    timezone?: string;
  }) {
    const { data, error } = await this.supabase.client
      .from('tenants')
      .insert({
        name: dto.name,
        slug: dto.slug,
        business_type: dto.businessType,
        subscription_plan: dto.subscriptionPlan || 'starter',
        monthly_fee_ngn: dto.monthlyFeeNgn || 0,
        timezone: dto.timezone || 'Africa/Lagos',
        status: 'trial',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Auto-create default AI agent
    await this.supabase.client.from('ai_agents').insert({
      tenant_id: data.id,
      name: 'AI Assistant',
      system_prompt: `You are a helpful AI assistant for ${dto.name}. Be friendly, professional, and helpful. Always respond in the language the customer uses.`,
      persona: 'Professional and friendly Nigerian business assistant',
    });

    this.logger.log(`Tenant created: ${data.name} (${data.id})`);
    return data;
  }

  async update(id: string, dto: Partial<{
    name: string;
    status: string;
    subscriptionPlan: string;
    monthlyFeeNgn: number;
    settings: Record<string, any>;
  }>) {
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.status) updateData.status = dto.status;
    if (dto.subscriptionPlan) updateData.subscription_plan = dto.subscriptionPlan;
    if (dto.monthlyFeeNgn !== undefined) updateData.monthly_fee_ngn = dto.monthlyFeeNgn;
    if (dto.settings) updateData.settings = dto.settings;

    const { data, error } = await this.supabase.client
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getStats(id: string) {
    const [contacts, conversations, orders, usage] = await Promise.all([
      this.supabase.client.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', id),
      this.supabase.client.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', id).eq('status', 'open'),
      this.supabase.client.from('orders').select('total_ngn').eq('tenant_id', id).eq('payment_status', 'paid'),
      this.supabase.client.from('usage_tracking').select('*').eq('tenant_id', id).order('month', { ascending: false }).limit(1).single(),
    ]);

    const totalRevenue = orders.data?.reduce((s: number, o: any) => s + (o.total_ngn || 0), 0) || 0;

    return {
      totalContacts: contacts.count || 0,
      openConversations: conversations.count || 0,
      totalRevenueNgn: totalRevenue,
      currentUsage: usage.data || null,
    };
  }

  async addWhatsAppAccount(tenantId: string, dto: {
    phoneNumber: string;
    phoneNumberId: string;
    wabaId: string;
    displayName: string;
    dialog360ApiKey: string;
  }) {
    const { data, error } = await this.supabase.client
      .from('whatsapp_accounts')
      .insert({
        tenant_id: tenantId,
        phone_number: dto.phoneNumber,
        phone_number_id: dto.phoneNumberId,
        waba_id: dto.wabaId,
        display_name: dto.displayName,
        dialog360_api_key: dto.dialog360ApiKey,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getAgencyOverview() {
    const [tenants, todayAnalytics] = await Promise.all([
      this.supabase.client
        .from('tenants')
        .select('id, name, status, subscription_plan, monthly_fee_ngn')
        .neq('slug', 'afribot-agency'),
      this.supabase.client
        .from('analytics_daily')
        .select('*')
        .eq('date', new Date().toISOString().slice(0, 10)),
    ]);

    const totalMRR = tenants.data?.reduce((s: number, t: any) => s + (t.monthly_fee_ngn || 0), 0) || 0;
    const activeClients = tenants.data?.filter((t: any) => t.status === 'active').length || 0;
    const totalMessages = todayAnalytics.data?.reduce((s: number, a: any) => s + (a.messages_inbound || 0) + (a.messages_outbound || 0), 0) || 0;
    const totalRevenue = todayAnalytics.data?.reduce((s: number, a: any) => s + (a.revenue_ngn || 0), 0) || 0;

    return {
      totalClients: tenants.data?.length || 0,
      activeClients,
      monthlyRecurringRevenueNgn: totalMRR,
      todayMessages: totalMessages,
      todayOrderRevenueNgn: totalRevenue,
      clients: tenants.data || [],
    };
  }
}
