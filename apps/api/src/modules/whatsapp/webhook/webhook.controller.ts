import {
  Controller, Post, Get, Query, Body, Headers,
  HttpCode, HttpStatus, Logger, RawBodyRequest, Req, Res,
  UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { WhatsAppWebhookService } from './webhook.service';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly webhookService: WhatsAppWebhookService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Meta webhook verification (GET) — runs once when you configure the webhook URL
   */
  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    }

    this.logger.warn('Webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  /**
   * Incoming WhatsApp messages — multi-tenant routing
   * This single endpoint handles ALL clients. Routes by destination phone number.
   */
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive incoming WhatsApp messages' })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
  ) {
    // 1. Verify webhook signature (HMAC-SHA256)
    await this.verifySignature(req.rawBody, signature);

    // 2. Quick ack to Meta (must respond within 5 seconds)
    // Processing happens async via queue

    // 3. Route to appropriate tenant processor
    if (body?.object !== 'whatsapp_business_account') {
      return { status: 'ignored' };
    }

    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change?.field === 'messages') {
          await this.webhookService.processWebhookPayload({
            wabaId: entry.id,
            value: change.value,
          });
        }
      }
    }

    return { status: 'ok' };
  }

  private async verifySignature(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get('WEBHOOK_SECRET');
    if (!webhookSecret) return; // Skip in dev

    if (!signature?.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
