import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { InboundEmailService } from './inbound-email.service';
import { EmailWebhookController } from './email-webhook.controller';
import { EmailEventListener } from './email-events.listener';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [EmailWebhookController],
  providers: [EmailService, InboundEmailService, EmailEventListener],
  exports: [EmailService, InboundEmailService],
})
export class NotificationsModule {}
