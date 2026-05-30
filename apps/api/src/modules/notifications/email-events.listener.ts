import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { SupabaseService } from '../../config/supabase.service';

@Injectable()
export class EmailEventListener {
  private readonly logger = new Logger(EmailEventListener.name);

  constructor(
    private readonly email: EmailService,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── Order created → send confirmation if customer has email ──────────────
  @OnEvent('order.created')
  async onOrderCreated(event: { tenantId: string; orderId: string; orderNumber: string; total: number }) {
    try {
      const { data: order } = await this.supabase.client
        .from('orders')
        .select('*, contacts(*), order_items(*, products(name)), tenants(name)')
        .eq('id', event.orderId)
        .single();

      if (!order?.contacts?.email) return; // no email on file, skip

      await this.email.sendOrderConfirmation({
        customerEmail: order.contacts.email,
        customerName: order.contacts.name || 'Customer',
        businessName: order.tenants?.name || 'Our Business',
        orderNumber: order.order_number,
        items: (order.order_items || []).map((i: any) => ({
          name: i.products?.name || i.product_name,
          qty: i.quantity,
          price: `₦${((i.total_price_ngn || 0) / 100).toLocaleString()}`,
        })),
        total: `₦${((order.total_ngn || 0) / 100).toLocaleString()}`,
        paymentUrl: order.paystack_payment_url,
      });
    } catch (err) {
      this.logger.error(`Order confirmation email failed: ${err.message}`);
    }
  }

  // ── Payment confirmed → send receipt ─────────────────────────────────────
  @OnEvent('order.paid')
  async onOrderPaid(event: { tenantId: string; orderId: string }) {
    try {
      const { data: order } = await this.supabase.client
        .from('orders')
        .select('*, contacts(*), tenants(name)')
        .eq('id', event.orderId)
        .single();

      if (!order?.contacts?.email) return;

      await this.email.sendPaymentConfirmation({
        customerEmail: order.contacts.email,
        customerName: order.contacts.name || 'Customer',
        businessName: order.tenants?.name,
        orderNumber: order.order_number,
        total: `₦${((order.total_ngn || 0) / 100).toLocaleString()}`,
        paidAt: new Date(order.payment_confirmed_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
      });
    } catch (err) {
      this.logger.error(`Payment receipt email failed: ${err.message}`);
    }
  }

  // ── Low stock → alert agency admin ────────────────────────────────────────
  @OnEvent('inventory.low-stock')
  async onLowStock(event: { tenantId: string; productId: string; currentStock: number }) {
    try {
      const agencyEmail = this.config.get('AGENCY_EMAIL', 'admin@youragency.com');

      const { data: product } = await this.supabase.client
        .from('products')
        .select('name, tenants(name)')
        .eq('id', event.productId)
        .single();

      if (!product) return;

      // Batch: collect alerts for 5 minutes before sending one email
      // (simple approach: just send each one for now)
      await this.email.sendLowStockAlert({
        agencyEmail,
        agencyName: this.config.get('AGENCY_NAME', 'AfriBot Agency'),
        alerts: [{
          productName: product.name,
          clientName: (product as any).tenants?.name || 'Unknown client',
          currentStock: event.currentStock,
          reorderPoint: 10,
        }],
      });
    } catch (err) {
      this.logger.error(`Low stock alert email failed: ${err.message}`);
    }
  }

  // ── Handoff requested → alert staff by email ─────────────────────────────
  @OnEvent('email.handoff-needed')
  async onEmailHandoff(event: { tenantId: string; conversation: any; contact: any }) {
    try {
      const { data: staffList } = await this.supabase.client
        .from('users')
        .select('email, full_name')
        .eq('tenant_id', event.tenantId)
        .in('role', ['client_admin', 'agency_admin'])
        .eq('is_active', true);

      for (const staff of staffList || []) {
        if (!staff.email) continue;
        await this.email.sendHandoffAlert({
          staffEmail: staff.email,
          staffName: staff.full_name || 'Team Member',
          businessName: 'Your Business',
          customerName: event.contact?.name || event.contact?.email || 'Customer',
          customerPhone: event.contact?.email || event.contact?.whatsapp_number || '',
          lastMessage: 'Customer requested human assistance',
          conversationUrl: `${this.config.get('WEB_URL')}/conversations`,
        });
      }
    } catch (err) {
      this.logger.error(`Handoff alert email failed: ${err.message}`);
    }
  }
}
