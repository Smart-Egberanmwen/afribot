import { Controller, Post, Body, Headers, HttpCode, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboundEmailService } from './inbound-email.service';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('email')
@Controller('email')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(
    private readonly inbound: InboundEmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Postmark inbound webhook — receives emails forwarded to your domains.
   * Configure in Postmark: Inbound → Webhook URL → https://yourapi.com/api/v1/email/inbound
   */
  @Post('inbound')
  @Public()
  @HttpCode(200)
  async handleInbound(
    @Body() payload: any,
    @Headers('x-postmark-server-token') token: string,
  ) {
    // Validate Postmark server token
    const expected = this.config.get('POSTMARK_INBOUND_TOKEN');
    if (expected && token !== expected) {
      this.logger.warn('Inbound email rejected: invalid token');
      return { status: 'rejected' };
    }

    // Postmark sends batched or single — handle both
    const emails = Array.isArray(payload) ? payload : [payload];

    for (const email of emails) {
      if (!email?.From) continue;
      await this.inbound.handleInbound(email).catch(err =>
        this.logger.error(`Failed to process inbound email: ${err.message}`)
      );
    }

    return { status: 'ok' };
  }

  /**
   * Sendgrid inbound parse webhook (alternative to Postmark)
   * Configure in SendGrid: Inbound Parse → https://yourapi.com/api/v1/email/inbound/sendgrid
   */
  @Post('inbound/sendgrid')
  @Public()
  @HttpCode(200)
  async handleSendgridInbound(@Body() payload: any) {
    // SendGrid inbound parse sends multipart form data
    if (!payload?.from) return { status: 'ignored' };

    await this.inbound.handleInbound({
      From: payload.from,
      FromEmail: payload.from?.match(/<([^>]+)>/)?.[1] || payload.from,
      To: payload.to,
      Subject: payload.subject || '(no subject)',
      TextBody: payload.text || '',
      HtmlBody: payload.html || '',
      StrippedTextReply: payload.text || '',
      MessageID: payload.headers?.match(/Message-ID:\s*<([^>]+)>/i)?.[1] || `sg-${Date.now()}`,
    }).catch(err => this.logger.error(`SendGrid inbound error: ${err.message}`));

    return { status: 'ok' };
  }
}
