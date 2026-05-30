import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getOrCreate(tenantId: string, contactId: string) {
    // Get most recent open/bot conversation
    const { data: existing } = await this.supabase.client
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .in('status', ['open', 'bot', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return existing;

    // Create new conversation
    const { data, error } = await this.supabase.client
      .from('conversations')
      .insert({ tenant_id: tenantId, contact_id: contactId, status: 'bot' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getHistory(conversationId: string, limit = 20): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const { data } = await this.supabase.client
      .from('messages')
      .select('direction, content')
      .eq('conversation_id', conversationId)
      .not('content', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(limit);

    return (data || [])
      .reverse()
      .filter((m: any) => m.content)
      .map((m: any) => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content,
      }));
  }

  async triggerHandoff(tenantId: string, conversationId: string) {
    await this.supabase.client
      .from('conversations')
      .update({
        status: 'handoff',
        handoff_requested_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    this.logger.log(`Handoff triggered: ${conversationId}`);
  }

  async resolveHandoff(tenantId: string, conversationId: string, agentId: string) {
    await this.supabase.client
      .from('conversations')
      .update({ status: 'open', assigned_to: agentId })
      .eq('tenant_id', tenantId)
      .eq('id', conversationId);
  }

  async resolve(tenantId: string, conversationId: string) {
    await this.supabase.client
      .from('conversations')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', conversationId);
  }

  async updateContext(conversationId: string, context: any) {
    const { data: conv } = await this.supabase.client
      .from('conversations')
      .select('context')
      .eq('id', conversationId)
      .single();

    await this.supabase.client
      .from('conversations')
      .update({ context: { ...(conv?.context || {}), ...context } })
      .eq('id', conversationId);
  }

  async findAll(tenantId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 30, status } = filters;

    let query = this.supabase.client
      .from('conversations')
      .select(`
        *,
        contacts(name, whatsapp_number),
        messages(content, direction, sent_at)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) query = query.eq('status', status);

    const { data, count } = await query;
    return { data: data || [], total: count || 0 };
  }

  async getMessages(tenantId: string, conversationId: string, limit = 50) {
    const { data } = await this.supabase.client
      .from('messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true })
      .limit(limit);
    return data || [];
  }
}
