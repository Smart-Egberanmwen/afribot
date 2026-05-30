import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SupabaseService } from '../../config/supabase.service';

@Injectable()
export class WhatsAppSenderService {
  private readonly logger = new Logger(WhatsAppSenderService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async sendText(tenantId: string, toPhone: string, text: string): Promise<string | null> {
    const account = await this.getAccount(tenantId);
    if (!account) {
      this.logger.error(`No WhatsApp account for tenant ${tenantId}`);
      return null;
    }

    try {
      const response = await axios.post(
        `https://waba.360dialog.io/v1/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: { preview_url: false, body: text },
        },
        {
          headers: {
            'D360-API-KEY': account.dialog360_api_key,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const msgId = response.data?.messages?.[0]?.id;
      this.logger.log(`Sent to ${toPhone}: ${text.slice(0, 50)}... [${msgId}]`);
      return msgId;
    } catch (err) {
      this.logger.error(`Failed to send to ${toPhone}: ${err.response?.data?.message || err.message}`);
      return null;
    }
  }

  async sendInteractiveButtons(
    tenantId: string,
    toPhone: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
  ): Promise<string | null> {
    const account = await this.getAccount(tenantId);
    if (!account) return null;

    try {
      const response = await axios.post(
        `https://waba.360dialog.io/v1/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'interactive',
          interactive: {
            type: 'button',
            ...(header && { header: { type: 'text', text: header } }),
            body: { text: body },
            action: {
              buttons: buttons.slice(0, 3).map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.slice(0, 20) },
              })),
            },
          },
        },
        {
          headers: { 'D360-API-KEY': account.dialog360_api_key, 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      return response.data?.messages?.[0]?.id;
    } catch (err) {
      // Fallback to plain text if interactive fails
      const fallbackText = `${header ? header + '\n\n' : ''}${body}\n\n` +
        buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
      return this.sendText(tenantId, toPhone, fallbackText);
    }
  }

  async sendList(
    tenantId: string,
    toPhone: string,
    body: string,
    buttonText: string,
    sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  ): Promise<string | null> {
    const account = await this.getAccount(tenantId);
    if (!account) return null;

    try {
      const response = await axios.post(
        `https://waba.360dialog.io/v1/messages`,
        {
          messaging_product: 'whatsapp',
          to: toPhone,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: body },
            action: { button: buttonText, sections },
          },
        },
        {
          headers: { 'D360-API-KEY': account.dialog360_api_key, 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      return response.data?.messages?.[0]?.id;
    } catch {
      const fallback = `${body}\n\n` + sections.flatMap(s =>
        [s.title + ':', ...s.rows.map((r, i) => `${i + 1}. ${r.title}${r.description ? ' - ' + r.description : ''}`)],
      ).join('\n');
      return this.sendText(tenantId, toPhone, fallback);
    }
  }

  async sendTemplate(tenantId: string, toPhone: string, templateName: string, components: any[]): Promise<string | null> {
    const account = await this.getAccount(tenantId);
    if (!account) return null;

    const response = await axios.post(
      `https://waba.360dialog.io/v1/messages`,
      {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: { name: templateName, language: { code: 'en' }, components },
      },
      { headers: { 'D360-API-KEY': account.dialog360_api_key, 'Content-Type': 'application/json' } },
    );

    return response.data?.messages?.[0]?.id;
  }

  async markRead(tenantId: string, messageId: string): Promise<void> {
    const account = await this.getAccount(tenantId);
    if (!account) return;

    await axios.post(
      `https://waba.360dialog.io/v1/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { 'D360-API-KEY': account.dialog360_api_key } },
    ).catch(() => {});
  }

  private async getAccount(tenantId: string) {
    const { data } = await this.supabase.client
      .from('whatsapp_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();
    return data;
  }
}
