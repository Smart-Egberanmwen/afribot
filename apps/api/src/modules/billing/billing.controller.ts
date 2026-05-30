import { Controller, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaystackService } from './paystack.service';
import { OrdersService } from '../orders/orders.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly orders: OrdersService,
  ) {}

  @Post('paystack/webhook')
  @Public()
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') sig: string,
    @Body() body: any,
  ) {
    const valid = this.paystack.verifyWebhookSignature(req.rawBody?.toString() || '', sig);
    if (!valid) return { status: 'ignored' };

    if (body.event === 'charge.success') {
      await this.orders.confirmPayment(body.data.reference);
    }
    return { status: 'ok' };
  }
}
