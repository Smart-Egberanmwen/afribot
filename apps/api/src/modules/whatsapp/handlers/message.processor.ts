import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SupabaseService } from '../../../config/supabase.service';
import { AiAgentService } from '../../ai/agents/ai-agent.service';
import { WhatsAppSenderService } from '../whatsapp-sender.service';
import { ContactsService } from '../../contacts/contacts.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { OrdersService } from '../../orders/orders.service';
import { InventoryService } from '../../inventory/inventory.service';

@Processor('whatsapp-messages')
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly ai: AiAgentService,
    private readonly sender: WhatsAppSenderService,
    private readonly contacts: ContactsService,
    private readonly conversations: ConversationsService,
    private readonly orders: OrdersService,
    private readonly inventory: InventoryService,
  ) {}

  @Process('process-inbound')
  async handleInbound(job: Job) {
    const { tenantId, contactPhone, contactName, message } = job.data;
    this.logger.debug(`Processing message from ${contactPhone} for tenant ${tenantId}`);

    try {
      // 1. Upsert contact
      const contact = await this.contacts.upsert(tenantId, {
        whatsappNumber: contactPhone,
        name: contactName,
      });

      // 2. Get or create conversation
      const conversation = await this.conversations.getOrCreate(tenantId, contact.id);

      // Check if in human handoff mode - skip AI
      if (conversation.status === 'handoff') {
        await this.saveMessage(tenantId, conversation.id, contact.id, message, 'inbound');
        return;
      }

      // 3. Save inbound message
      await this.saveMessage(tenantId, conversation.id, contact.id, message, 'inbound');

      // 4. Mark message as read
      await this.sender.markRead(tenantId, message.id);

      // 5. Get conversation history (last 20 messages)
      const history = await this.conversations.getHistory(conversation.id, 20);

      // 6. Call AI agent
      const messageText = this.extractText(message);
      if (!messageText) return; // Skip non-text messages for now

      const aiResponse = await this.ai.processMessage({
        tenantId,
        conversationId: conversation.id,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone,
        messageHistory: history,
        currentMessage: messageText,
      });

      // 7. Handle AI actions (tool calls)
      if (aiResponse.actions?.length) {
        for (const action of aiResponse.actions) {
          await this.executeAction(tenantId, contact, conversation.id, action);
        }
      }

      // 8. Handle human handoff
      if (aiResponse.shouldHandoff) {
        await this.conversations.triggerHandoff(tenantId, conversation.id);
        await this.notifyStaff(tenantId, contact, messageText);
      }

      // 9. Send AI response back to WhatsApp
      if (aiResponse.text) {
        const msgId = await this.sender.sendText(tenantId, contactPhone, aiResponse.text);

        // Save outbound message
        await this.saveMessage(tenantId, conversation.id, null, {
          id: msgId,
          type: 'text',
          text: { body: aiResponse.text },
          timestamp: Math.floor(Date.now() / 1000).toString(),
          from: 'system',
        }, 'outbound', true, aiResponse.provider);
      }

      // 10. Update conversation context
      await this.conversations.updateContext(conversation.id, {
        lastMessageAt: new Date().toISOString(),
        aiProvider: aiResponse.provider,
      });

    } catch (err) {
      this.logger.error(`Failed to process message from ${contactPhone}: ${err.message}`, err.stack);
      // Send fallback message
      try {
        await this.sender.sendText(
          tenantId,
          contactPhone,
          "I'm sorry, I'm having a little trouble right now. Please try again in a moment, or type *human* to speak with our team. 🙏",
        );
      } catch {}
    }
  }

  @Process('update-status')
  async handleStatusUpdate(job: Job) {
    const { tenantId, status } = job.data;

    if (['delivered', 'read'].includes(status.status)) {
      const updateData: any = {};
      if (status.status === 'delivered') updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      if (status.status === 'read') updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();

      await this.supabase.client
        .from('messages')
        .update(updateData)
        .eq('whatsapp_message_id', status.id);
    }
  }

  private async executeAction(tenantId: string, contact: any, conversationId: string, action: any) {
    try {
      switch (action.type) {
        case 'create_order':
          await this.orders.createFromAI(tenantId, contact.id, conversationId, action.payload);
          break;
        case 'check_inventory':
          // Inventory check is done inline in AI context
          break;
        case 'generate_payment_link':
          // Payment link generation handled by orders module
          break;
      }
    } catch (err) {
      this.logger.error(`Action ${action.type} failed: ${err.message}`);
    }
  }

  private async notifyStaff(tenantId: string, contact: any, message: string) {
    // Get staff users for this tenant
    const { data: staff } = await this.supabase.client
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['client_admin', 'agency_admin']);

    // In production: send email/push notification to staff
    this.logger.log(`Handoff requested for ${contact.whatsapp_number} - notifying ${staff?.length || 0} staff`);
  }

  private async saveMessage(
    tenantId: string,
    conversationId: string,
    contactId: string | null,
    message: any,
    direction: 'inbound' | 'outbound',
    aiGenerated = false,
    aiProvider?: string,
  ) {
    await this.supabase.client.from('messages').upsert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      contact_id: contactId,
      whatsapp_message_id: message.id,
      direction,
      type: message.type || 'text',
      content: this.extractText(message),
      ai_generated: aiGenerated,
      ai_provider: aiProvider,
      sent_at: new Date(parseInt(message.timestamp || '0') * 1000 || Date.now()).toISOString(),
    }, { onConflict: 'whatsapp_message_id' });
  }

  private extractText(message: any): string | null {
    if (message.type === 'text') return message.text?.body;
    if (message.type === 'interactive') {
      return message.interactive?.button_reply?.title ||
             message.interactive?.list_reply?.title;
    }
    if (message.type === 'image') return message.image?.caption || '[Image]';
    if (message.type === 'audio') return '[Voice message]';
    if (message.type === 'document') return `[Document: ${message.document?.filename}]`;
    return null;
  }
}
