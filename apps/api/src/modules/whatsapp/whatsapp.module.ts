import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WhatsAppWebhookController } from './webhook/webhook.controller';
import { WhatsAppWebhookService } from './webhook/webhook.service';
import { WhatsAppSenderService } from './whatsapp-sender.service';
import { MessageProcessor } from './handlers/message.processor';
import { AiModule } from '../ai/ai.module';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ContactsModule } from '../contacts/contacts.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'whatsapp-messages' },
      { name: 'message-status' },
      { name: 'broadcasts' },
    ),
    AiModule,
    OrdersModule,
    InventoryModule,
    ContactsModule,
    ConversationsModule,
  ],
  controllers: [WhatsAppWebhookController],
  providers: [
    WhatsAppWebhookService,
    WhatsAppSenderService,
    MessageProcessor,
  ],
  exports: [WhatsAppSenderService],
})
export class WhatsAppModule {}
