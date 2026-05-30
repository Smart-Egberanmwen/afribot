import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface PaymentLinkResult {
  url: string;
  reference: string;
  accessCode: string;
}

interface PaymentVerification {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount: number;      // in kobo
  paidAt?: string;
  customerEmail?: string;
  metadata?: any;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.http = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${config.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initializeTransaction(params: {
    tenantId: string;
    orderId: string;
    orderNumber: string;
    amountNgn: number;   // in kobo
    customerPhone: string;
    customerName?: string;
    callbackUrl?: string;
    description?: string;
  }): Promise<PaymentLinkResult> {
    const reference = `AFRI-${params.tenantId.slice(0, 8)}-${params.orderNumber}`;

    const { data } = await this.http.post('/transaction/initialize', {
      amount: params.amountNgn,
      email: `${params.customerPhone.replace('+', '')}@afribot-order.com`,
      reference,
      callback_url: params.callbackUrl || `${this.config.get('WEB_URL')}/payment/callback`,
      metadata: {
        custom_fields: [
          {
            display_name: 'Order Number',
            variable_name: 'order_number',
            value: params.orderNumber,
          },
          {
            display_name: 'Customer Phone',
            variable_name: 'customer_phone',
            value: params.customerPhone,
          },
        ],
        tenant_id: params.tenantId,
        order_id: params.orderId,
        order_number: params.orderNumber,
        cancel_action: `${this.config.get('WEB_URL')}/payment/cancel`,
      },
      channels: ['card', 'bank', 'ussd', 'bank_transfer', 'mobile_money'],
    });

    if (!data.status) {
      throw new Error(`Paystack initialization failed: ${data.message}`);
    }

    this.logger.log(`Payment link created for order ${params.orderNumber}: ${data.data.authorization_url}`);

    return {
      url: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerification> {
    const { data } = await this.http.get(`/transaction/verify/${reference}`);

    if (!data.status) {
      throw new Error(`Verification failed: ${data.message}`);
    }

    const tx = data.data;
    return {
      status: tx.status,
      reference: tx.reference,
      amount: tx.amount,
      paidAt: tx.paid_at,
      customerEmail: tx.customer?.email,
      metadata: tx.metadata,
    };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = this.config.get('PAYSTACK_WEBHOOK_SECRET');
    const hash = require('crypto')
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex');
    return hash === signature;
  }

  // Format amount for WhatsApp message
  formatAmount(amountKobo: number): string {
    const naira = amountKobo / 100;
    return `₦${naira.toLocaleString('en-NG')}`;
  }
}
