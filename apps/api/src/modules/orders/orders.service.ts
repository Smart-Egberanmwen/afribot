import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly events: EventEmitter2,
  ) {}

  async createFromAI(tenantId: string, contactId: string, conversationId: string, payload: {
    items: Array<{ product_name: string; quantity: number; variant?: string }>;
    delivery_address?: string;
    notes?: string;
  }) {
    // Resolve products by name
    const resolvedItems = [];
    let subtotal = 0;

    for (const item of payload.items) {
      const { data: product } = await this.supabase.client
        .from('products')
        .select('*, inventory(*)')
        .eq('tenant_id', tenantId)
        .ilike('name', `%${item.product_name}%`)
        .eq('is_active', true)
        .single();

      if (product) {
        const itemTotal = product.price_ngn * item.quantity;
        subtotal += itemTotal;
        resolvedItems.push({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: item.quantity,
          unit_price_ngn: product.price_ngn,
          total_price_ngn: itemTotal,
          variant: item.variant,
        });

        // Reserve inventory
        await this.supabase.client
          .from('inventory')
          .update({ quantity_reserved: (product.inventory?.[0]?.quantity_reserved || 0) + item.quantity })
          .eq('tenant_id', tenantId)
          .eq('product_id', product.id);
      }
    }

    if (resolvedItems.length === 0) return null;

    // Generate order number
    const { data: orderNumResult } = await this.supabase.client
      .rpc('generate_order_number', { p_tenant_id: tenantId });

    const orderNumber = orderNumResult || `ORD-${Date.now()}`;
    const total = subtotal; // add delivery fee logic here

    const { data: order, error } = await this.supabase.client
      .from('orders')
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        contact_id: contactId,
        conversation_id: conversationId,
        status: 'pending',
        payment_status: 'pending',
        subtotal_ngn: subtotal,
        total_ngn: total,
        delivery_address: payload.delivery_address ? { raw: payload.delivery_address } : null,
        notes: payload.notes,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create order items
    await this.supabase.client.from('order_items').insert(
      resolvedItems.map(item => ({ ...item, order_id: order.id, tenant_id: tenantId }))
    );

    this.events.emit('order.created', { tenantId, orderId: order.id, orderNumber, total });
    this.logger.log(`Order created: ${orderNumber} for tenant ${tenantId} - ₦${(total / 100).toLocaleString()}`);

    return { ...order, items: resolvedItems };
  }

  async findAll(tenantId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20, status } = filters;

    let query = this.supabase.client
      .from('orders')
      .select(`
        *, 
        contacts(name, whatsapp_number),
        order_items(*, products(name, image_urls))
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);

    const { data, count } = await query;
    return { data: data || [], total: count || 0, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const { data } = await this.supabase.client
      .from('orders')
      .select('*, contacts(*), order_items(*, products(*))')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();
    if (!data) throw new NotFoundException('Order not found');
    return data;
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const { data } = await this.supabase.client
      .from('orders')
      .update({ status })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    return data;
  }

  async attachPaymentLink(tenantId: string, orderId: string, paystackRef: string, paymentUrl: string) {
    await this.supabase.client
      .from('orders')
      .update({ paystack_reference: paystackRef, paystack_payment_url: paymentUrl })
      .eq('tenant_id', tenantId)
      .eq('id', orderId);
  }

  async confirmPayment(paystackReference: string) {
    const { data: order } = await this.supabase.client
      .from('orders')
      .select('*')
      .eq('paystack_reference', paystackReference)
      .single();

    if (!order) return null;

    await this.supabase.client
      .from('orders')
      .update({ payment_status: 'paid', status: 'confirmed', payment_confirmed_at: new Date().toISOString() })
      .eq('id', order.id);

    this.events.emit('order.paid', { tenantId: order.tenant_id, orderId: order.id });
    return order;
  }
}
