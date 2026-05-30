import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import dayjs from 'dayjs';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getTenantAnalytics(tenantId: string, days = 30) {
    const from = dayjs().subtract(days, 'day').format('YYYY-MM-DD');

    const [daily, orders, messages] = await Promise.all([
      this.supabase.client
        .from('analytics_daily')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('date', from)
        .order('date'),

      this.supabase.client
        .from('orders')
        .select('status, payment_status, total_ngn, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${from}T00:00:00Z`),

      this.supabase.client
        .from('messages')
        .select('direction, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${from}T00:00:00Z`),
    ]);

    const totalRevenue = orders.data?.filter((o: any) => o.payment_status === 'paid')
      .reduce((s: number, o: any) => s + o.total_ngn, 0) || 0;

    const totalOrders = orders.data?.length || 0;
    const completedOrders = orders.data?.filter((o: any) => o.status === 'delivered').length || 0;
    const totalMessages = messages.data?.length || 0;
    const inboundMessages = messages.data?.filter((m: any) => m.direction === 'inbound').length || 0;

    return {
      summary: {
        totalRevenueNgn: totalRevenue,
        totalOrders,
        completedOrders,
        conversionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
        totalMessages,
        inboundMessages,
        avgOrderValueNgn: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
      dailyData: daily.data || [],
    };
  }

  async recordDailySnapshot(tenantId: string) {
    const today = dayjs().format('YYYY-MM-DD');

    const [msgs, convs, orders] = await Promise.all([
      this.supabase.client.from('messages').select('direction').eq('tenant_id', tenantId)
        .gte('created_at', `${today}T00:00:00Z`),
      this.supabase.client.from('conversations').select('status').eq('tenant_id', tenantId)
        .gte('created_at', `${today}T00:00:00Z`),
      this.supabase.client.from('orders').select('total_ngn, status').eq('tenant_id', tenantId)
        .gte('created_at', `${today}T00:00:00Z`),
    ]);

    const inbound = msgs.data?.filter((m: any) => m.direction === 'inbound').length || 0;
    const outbound = msgs.data?.filter((m: any) => m.direction === 'outbound').length || 0;
    const revenue = orders.data?.filter((o: any) => o.status === 'delivered')
      .reduce((s: number, o: any) => s + o.total_ngn, 0) || 0;

    await this.supabase.client.from('analytics_daily').upsert({
      tenant_id: tenantId,
      date: today,
      messages_inbound: inbound,
      messages_outbound: outbound,
      total_conversations: convs.data?.length || 0,
      orders_created: orders.data?.length || 0,
      revenue_ngn: revenue,
    }, { onConflict: 'tenant_id,date' });
  }
}
