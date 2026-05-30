import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../config/supabase.service';
import { AiAgentService } from '../ai/agents/ai-agent.service';
import { EmailService } from './email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Postmark inbound webhook payload shape
export interface InboundEmailPayload {
  From: string;           // "Amara Kalu <amara@gmail.com>"
  FromEmail?: string;     // "amara@gmail.com"
  FromFull?: { Email: string; Name: string };
  To: string;             // "support@mail.yourbusiness.com"
  Subject: string;
  TextBody: string;
  HtmlBody?: string;
  StrippedTextReply?: string;  // just the reply text, no quoted history
  MessageID: string;
  ReplyTo?: string;
  Headers?: Array<{ Name: string; Value: string }>;
  Attachments?: Array<{ Name: string; Content: string; ContentType: string }>;
}

@Injectable()
export class InboundEmailService {
  private readonly logger = new Logger(InboundEmailService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiAgentService,
    private readonly emailSender: EmailService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  /**
   * Entry point called by the webhook controller when Postmark delivers an email.
   * Routes the email to the correct tenant, creates a conversation, runs AI.
   */
  async handleInbound(payload: InboundEmailPayload): Promise<void> {
    // 1. Parse sender
    const senderEmail = payload.FromFull?.Email || payload.FromEmail || this.extractEmail(payload.From);
    const senderName  = payload.FromFull?.Name  || this.extractName(payload.From);

    // 2. Resolve which tenant this email belongs to (by destination address)
    const tenant = await this.resolveTenantByEmail(payload.To);
    if (!tenant) {
      this.logger.warn(`No tenant for inbound email To: ${payload.To}`);
      return;
    }

    // 3. Use only the new reply text (strip quoted history)
    const messageText = payload.StrippedTextReply?.trim()
      || this.stripHtml(payload.HtmlBody || '')?.trim()
      || payload.TextBody?.trim()
      || payload.Subject;

    if (!messageText) return;

    // 4. Upsert contact by email address
    const contact = await this.upsertEmailContact(tenant.id, senderEmail, senderName);

    // 5. Get or create an email conversation thread
    // Thread key: subject line (normalised) so replies stay in the same conversation
    const threadKey = this.normaliseSubject(payload.Subject);
    const conversation = await this.getOrCreateEmailConversation(tenant.id, contact.id, threadKey, payload.Subject);

    // 6. Save inbound message
    await this.saveEmailMessage(tenant.id, conversation.id, contact.id, {
      messageId: payload.MessageID,
      direction: 'inbound',
      subject: payload.Subject,
      body: messageText,
      senderEmail,
    });

    // 7. If conversation is in human handoff mode, skip AI
    if (conversation.status === 'handoff') {
      this.events.emit('email.handoff-needed', { tenantId: tenant.id, conversation, contact });
      return;
    }

    // 8. Fetch message history for AI context
    const history = await this.getEmailHistory(conversation.id);

    // 9. Call AI agent — same agent as WhatsApp, channel-agnostic
    let aiResponse: any;
    try {
      aiResponse = await this.ai.processMessage({
        tenantId: tenant.id,
        conversationId: conversation.id,
        contactId: contact.id,
        contactName: senderName,
        contactPhone: senderEmail,   // email used as identifier
        messageHistory: history,
        currentMessage: `[Email from ${senderName}] Subject: ${payload.Subject}\n\n${messageText}`,
      });
    } catch (err) {
      this.logger.error(`AI failed for email conversation: ${err.message}`);
      return;
    }

    // 10. Handle handoff request
    if (aiResponse.shouldHandoff) {
      await this.supabase.client
        .from('conversations')
        .update({ status: 'handoff', handoff_requested_at: new Date().toISOString() })
        .eq('id', conversation.id);
      this.events.emit('email.handoff-needed', { tenantId: tenant.id, conversation, contact });
    }

    // 11. Send AI reply back via email
    if (aiResponse.text) {
      const replyTo = `${tenant.emailReplyAddress || `support@${tenant.slug}.afribot.agency`}`;

      await this.emailSender.send({
        to: senderEmail,
        from: `${tenant.name} <${replyTo}>`,
        replyTo,
        subject: payload.Subject.startsWith('Re:') ? payload.Subject : `Re: ${payload.Subject}`,
        html: this.buildReplyHtml(aiResponse.text, tenant.name, senderName),
      });

      // 12. Save outbound AI reply
      await this.saveEmailMessage(tenant.id, conversation.id, null, {
        messageId: `ai-${Date.now()}`,
        direction: 'outbound',
        subject: `Re: ${payload.Subject}`,
        body: aiResponse.text,
        senderEmail: replyTo,
        aiGenerated: true,
        aiProvider: aiResponse.provider,
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async resolveTenantByEmail(toAddress: string): Promise<any> {
    // Match by email_address field on tenants, or slug-based subdomain
    // e.g. support@mama-tee-kitchen.afribot.agency → slug = mama-tee-kitchen
    const slug = this.extractSlugFromEmail(toAddress);
    if (!slug) return null;

    const { data } = await this.supabase.client
      .from('tenants')
      .select('*')
      .or(`slug.eq.${slug},settings->email_address.eq.${toAddress}`)
      .eq('status', 'active')
      .single();

    return data;
  }

  private extractSlugFromEmail(email: string): string | null {
    // support@mama-tee-kitchen.afribot.agency → mama-tee-kitchen
    const match = email.match(/^[^@]+@([^.]+)\./);
    return match ? match[1] : null;
  }

  private async upsertEmailContact(tenantId: string, email: string, name: string) {
    const { data } = await this.supabase.client
      .from('contacts')
      .upsert({
        tenant_id: tenantId,
        whatsapp_number: `email:${email}`,  // prefix to distinguish from WA numbers
        email,
        name: name || email.split('@')[0],
        last_interaction_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,whatsapp_number' })
      .select()
      .single();
    return data;
  }

  private async getOrCreateEmailConversation(tenantId: string, contactId: string, threadKey: string, subject: string) {
    // Look for open conversation with same thread key
    const { data: existing } = await this.supabase.client
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId)
      .eq('context->channel', 'email')
      .eq('context->thread_key', threadKey)
      .not('status', 'eq', 'resolved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) return existing;

    const { data } = await this.supabase.client
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        status: 'bot',
        subject,
        context: { channel: 'email', thread_key: threadKey },
      })
      .select()
      .single();

    return data;
  }

  private async getEmailHistory(conversationId: string) {
    const { data } = await this.supabase.client
      .from('messages')
      .select('direction, content')
      .eq('conversation_id', conversationId)
      .not('content', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10);

    return (data || []).reverse().map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));
  }

  private async saveEmailMessage(
    tenantId: string,
    conversationId: string,
    contactId: string | null,
    msg: {
      messageId: string; direction: string; subject: string;
      body: string; senderEmail: string;
      aiGenerated?: boolean; aiProvider?: string;
    },
  ) {
    await this.supabase.client.from('messages').upsert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      whatsapp_message_id: `email:${msg.messageId}`,
      direction: msg.direction,
      type: 'text',
      content: msg.body,
      ai_generated: msg.aiGenerated || false,
      ai_provider: msg.aiProvider,
      metadata: { channel: 'email', subject: msg.subject, sender_email: msg.senderEmail },
      sent_at: new Date().toISOString(),
    }, { onConflict: 'whatsapp_message_id' });
  }

  private buildReplyHtml(text: string, businessName: string, recipientName: string): string {
    const paragraphs = text.split('\n').filter(Boolean).map(p =>
      `<p style="margin:0 0 12px;color:#333;font-size:15px;line-height:1.6;">${p}</p>`
    ).join('');

    return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f0;padding:32px 20px;">
      <table width="560" style="background:white;border-radius:12px;padding:32px;margin:auto;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td>
          <p style="margin:0 0 16px;color:#999;font-size:13px;">${businessName}</p>
          ${paragraphs}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="margin:0;color:#bbb;font-size:11px;">Powered by AfriBot Agency OS</p>
        </td></tr>
      </table>
    </body></html>`;
  }

  private normaliseSubject(subject: string): string {
    return subject.toLowerCase().replace(/^(re:|fwd?:)\s*/gi, '').trim();
  }

  private extractEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return match ? match[1] : from;
  }

  private extractName(from: string): string {
    const match = from.match(/^([^<]+)</);
    return match ? match[1].trim().replace(/"/g, '') : '';
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
