import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';

@Injectable()
export class ContactsService {
  constructor(private readonly supabase: SupabaseService) {}

  async upsert(tenantId: string, dto: { whatsappNumber: string; name?: string }) {
    const { data, error } = await this.supabase.client
      .from('contacts')
      .upsert({
        tenant_id: tenantId,
        whatsapp_number: dto.whatsappNumber,
        name: dto.name,
        last_interaction_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,whatsapp_number' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(tenantId: string, filters: { search?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50, search } = filters;

    let query = this.supabase.client
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('last_interaction_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`);
    }

    const { data, count } = await query;
    return { data: data || [], total: count || 0, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const { data } = await this.supabase.client
      .from('contacts')
      .select('*, orders(id, order_number, status, total_ngn, created_at)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();
    return data;
  }

  async update(tenantId: string, id: string, dto: Partial<{ name: string; email: string; tags: string[]; notes: string }>) {
    const { data } = await this.supabase.client
      .from('contacts')
      .update(dto)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();
    return data;
  }
}
