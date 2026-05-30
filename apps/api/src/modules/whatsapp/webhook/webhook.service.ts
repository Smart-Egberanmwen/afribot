import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SupabaseService } from '../../../config/supabase.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WebhookPayload {
  wabaId: string;
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: Array<{ profile: { name: string }; wa_id: string }>;
    messages?: Array<WhatsAppMessage>;
    statuses?: Array<MessageStatus>;
  };
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; filename: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string };
  interactive?: { type: string; button_reply?: any; list_reply?: any };
  reaction?: { message_id: string; emoji: string };
  sticker?: { id: string; animated: boolean };
  context?: { from: string; id: string };
}

export interface MessageStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  errors?: Array<{ code: number; title: string }>;
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    @InjectQueue('whatsapp-messages') private readonly messageQueue: Queue,
    @InjectQueue('message-status') private readonly statusQueue: Queue,
    private readonly supabase: SupabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processWebhookPayload(payload: WebhookPayload): Promise<void> {
    const { value } = payload;
    const phoneNumberId = value.metadata?.phone_number_id;

    // Resolve tenant from phone number ID
    const tenant = await this.resolveTenant(phoneNumberId);
    if (!tenant) {
      this.logger.warn(`No tenant found for phone_number_id: ${phoneNumberId}`);
      return;
    }

    // Process incoming messages
    if (value.messages?.length) {
      for (const message of value.messages) {
        await this.messageQueue.add('process-inbound', {
          tenantId: tenant.id,
          wabaAccountId: tenant.wabaAccountId,
          contactPhone: message.from,
          contactName: value.contacts?.[0]?.profile?.name,
          message,
        }, {
          priority: 1,
          delay: 0,
        });
      }
    }

    // Process message status updates
    if (value.statuses?.length) {
      for (const status of value.statuses) {
        await this.statusQueue.add('update-status', {
          tenantId: tenant.id,
          status,
        }, { priority: 2 });
      }
    }
  }

  private async resolveTenant(phoneNumberId: string): Promise<{ id: string; wabaAccountId: string } | null> {
    const { data, error } = await this.supabase.client
      .from('whatsapp_accounts')
      .select('tenant_id, id')
      .eq('phone_number_id', phoneNumberId)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Update last webhook time
    await this.supabase.client
      .from('whatsapp_accounts')
      .update({ last_webhook_at: new Date().toISOString() })
      .eq('id', data.id);

    return { id: data.tenant_id, wabaAccountId: data.id };
  }
}
