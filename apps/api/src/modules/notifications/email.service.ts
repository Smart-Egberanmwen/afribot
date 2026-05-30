import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.fromAddress = config.get<string>('EMAIL_FROM', 'noreply@afribot.agency');

    if (apiKey && apiKey !== 're_...') {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  // ── Core send method ──────────────────────────────────────────────────────
  async send(payload: EmailPayload): Promise<boolean> {
    if (!this.resend) {
      this.logger.log(`[EMAIL MOCK] To: ${payload.to} | Subject: ${payload.subject}`);
      return true;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: payload.from || this.fromAddress,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        replyTo: payload.replyTo,
      });
      if (error) throw new Error(error.message);
      this.logger.log(`Email sent → ${payload.to}: ${payload.subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Email failed → ${payload.to}: ${err.message}`);
      return false;
    }
  }

  // ── Transactional email templates ─────────────────────────────────────────

  async sendOrderConfirmation(data: {
    customerEmail: string;
    customerName: string;
    businessName: string;
    orderNumber: string;
    items: Array<{ name: string; qty: number; price: string }>;
    total: string;
    paymentUrl?: string;
  }) {
    const itemRows = data.items.map(i =>
      `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">${i.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${i.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${i.price}</td>
      </tr>`
    ).join('');

    return this.send({
      to: data.customerEmail,
      subject: `Order Confirmed — ${data.orderNumber} | ${data.businessName}`,
      html: template({
        title: 'Your order is confirmed! 🎉',
        preheader: `Order ${data.orderNumber} from ${data.businessName}`,
        body: `
          <p style="font-size:16px;">Hi <strong>${data.customerName}</strong>,</p>
          <p>Your order has been received and is being prepared.</p>
          <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;font-weight:600;color:#555;">Order <span style="color:#0F6E56;">${data.orderNumber}</span></p>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="font-size:12px;color:#999;text-transform:uppercase;">
                  <th style="text-align:left;padding-bottom:8px;">Item</th>
                  <th style="text-align:center;padding-bottom:8px;">Qty</th>
                  <th style="text-align:right;padding-bottom:8px;">Price</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="margin-top:16px;padding-top:12px;border-top:2px solid #e0e0e0;display:flex;justify-content:space-between;">
              <span style="font-weight:700;font-size:16px;">Total</span>
              <span style="font-weight:700;font-size:18px;color:#0F6E56;">${data.total}</span>
            </div>
          </div>
          ${data.paymentUrl ? `
          <div style="text-align:center;margin:24px 0;">
            <a href="${data.paymentUrl}" style="background:#0F6E56;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
              Pay Now — ${data.total}
            </a>
            <p style="font-size:12px;color:#999;margin-top:8px;">Secure payment via Paystack</p>
          </div>` : ''}
          <p style="color:#666;">Questions? Just reply to this email or WhatsApp us directly.</p>
        `,
        footer: `© ${new Date().getFullYear()} ${data.businessName} · Powered by AfriBot`,
      }),
    });
  }

  async sendPaymentConfirmation(data: {
    customerEmail: string;
    customerName: string;
    businessName: string;
    orderNumber: string;
    total: string;
    paidAt: string;
  }) {
    return this.send({
      to: data.customerEmail,
      subject: `✅ Payment Received — ${data.orderNumber}`,
      html: template({
        title: 'Payment confirmed! ✅',
        preheader: `We got your payment for order ${data.orderNumber}`,
        body: `
          <p>Hi <strong>${data.customerName}</strong>,</p>
          <p>Your payment of <strong style="color:#0F6E56;">${data.total}</strong> has been confirmed.</p>
          <div style="background:#f0faf5;border:1px solid #9FE1CB;border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
            <div style="font-size:40px;">✅</div>
            <div style="font-size:22px;font-weight:700;color:#0F6E56;margin-top:8px;">${data.total} Received</div>
            <div style="color:#666;margin-top:4px;">Order ${data.orderNumber}</div>
            <div style="color:#999;font-size:12px;margin-top:4px;">${data.paidAt}</div>
          </div>
          <p>Your order is now being processed. You'll receive a WhatsApp update when it's ready.</p>
        `,
        footer: `© ${new Date().getFullYear()} ${data.businessName}`,
      }),
    });
  }

  async sendLowStockAlert(data: {
    agencyEmail: string;
    agencyName: string;
    alerts: Array<{ productName: string; clientName: string; currentStock: number; reorderPoint: number }>;
  }) {
    const rows = data.alerts.map(a =>
      `<tr>
        <td style="padding:10px;border-bottom:1px solid #f0f0f0;">${a.productName}</td>
        <td style="padding:10px;border-bottom:1px solid #f0f0f0;">${a.clientName}</td>
        <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="color:${a.currentStock === 0 ? '#dc2626' : '#d97706'};font-weight:700;">${a.currentStock}</span>
        </td>
        <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">${a.reorderPoint}</td>
      </tr>`
    ).join('');

    return this.send({
      to: data.agencyEmail,
      subject: `⚠️ Low Stock Alert — ${data.alerts.length} item${data.alerts.length > 1 ? 's' : ''} need restocking`,
      html: template({
        title: `⚠️ ${data.alerts.length} items need restocking`,
        preheader: 'Inventory alert from AfriBot Agency OS',
        body: `
          <p>The following products are running low across your clients:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <thead>
              <tr style="background:#fff8e6;font-size:12px;color:#92570A;text-transform:uppercase;">
                <th style="text-align:left;padding:10px;">Product</th>
                <th style="text-align:left;padding:10px;">Client</th>
                <th style="text-align:center;padding:10px;">Stock Left</th>
                <th style="text-align:center;padding:10px;">Reorder At</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="text-align:center;margin-top:24px;">
            <a href="${this.config.get('WEB_URL', 'https://app.afribot.agency')}/inventory"
               style="background:#0F6E56;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
              Restock Now →
            </a>
          </div>
        `,
        footer: 'AfriBot Agency OS · Low Stock Monitor',
      }),
    });
  }

  async sendHandoffAlert(data: {
    staffEmail: string;
    staffName: string;
    businessName: string;
    customerName: string;
    customerPhone: string;
    lastMessage: string;
    conversationUrl: string;
  }) {
    return this.send({
      to: data.staffEmail,
      subject: `⚡ Handoff Needed — ${data.customerName} @ ${data.businessName}`,
      html: template({
        title: '⚡ A customer needs human help',
        preheader: `${data.customerName} has requested to speak with staff`,
        body: `
          <p>Hi <strong>${data.staffName}</strong>,</p>
          <p>A customer on <strong>${data.businessName}</strong> has requested to speak with a human agent.</p>
          <div style="background:#fff8e6;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:16px;margin:20px 0;">
            <p style="margin:0;font-weight:600;">${data.customerName}</p>
            <p style="margin:4px 0 0;color:#666;font-size:14px;">${data.customerPhone}</p>
            <p style="margin:12px 0 0;font-style:italic;color:#555;">"${data.lastMessage}"</p>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="${data.conversationUrl}"
               style="background:#F59E0B;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
              Open Conversation →
            </a>
          </div>
        `,
        footer: 'AfriBot Agency OS · Handoff Notification',
      }),
    });
  }

  async sendWelcomeEmail(data: {
    to: string;
    name: string;
    agencyName: string;
    loginUrl: string;
  }) {
    return this.send({
      to: data.to,
      subject: `Welcome to ${data.agencyName} — You're all set! 🎉`,
      html: template({
        title: `Welcome to ${data.agencyName}! 🇳🇬`,
        preheader: 'Your WhatsApp AI automation is ready',
        body: `
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>Your account has been created successfully. Here's what you can do right away:</p>
          <ul style="color:#444;line-height:2;padding-left:20px;">
            <li>View your WhatsApp conversations in real-time</li>
            <li>Manage your product inventory</li>
            <li>Track orders placed by your AI bot</li>
            <li>Configure your AI agent's personality and knowledge</li>
          </ul>
          <div style="text-align:center;margin:28px 0;">
            <a href="${data.loginUrl}"
               style="background:#0F6E56;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
              Open Your Dashboard →
            </a>
          </div>
          <p style="color:#888;font-size:13px;">Questions? Reply to this email anytime.</p>
        `,
        footer: `© ${new Date().getFullYear()} ${data.agencyName} · Powered by AfriBot`,
      }),
    });
  }

  async sendMonthlyInvoice(data: {
    clientEmail: string;
    clientName: string;
    businessName: string;
    invoiceNumber: string;
    period: string;
    amount: string;
    dueDate: string;
    paymentUrl?: string;
  }) {
    return this.send({
      to: data.clientEmail,
      subject: `Invoice ${data.invoiceNumber} — ${data.businessName} (${data.period})`,
      html: template({
        title: `Invoice for ${data.period}`,
        preheader: `${data.amount} due for your AfriBot subscription`,
        body: `
          <p>Hi <strong>${data.clientName}</strong>,</p>
          <p>Here's your invoice for <strong>${data.period}</strong>.</p>
          <div style="background:#f9f9f7;border-radius:10px;padding:24px;margin:24px 0;">
            <table style="width:100%;">
              <tr><td style="color:#666;padding:6px 0;">Invoice #</td><td style="text-align:right;font-weight:600;">${data.invoiceNumber}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Service</td><td style="text-align:right;">WhatsApp AI Automation</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Period</td><td style="text-align:right;">${data.period}</td></tr>
              <tr><td style="color:#666;padding:6px 0;">Due Date</td><td style="text-align:right;">${data.dueDate}</td></tr>
              <tr style="border-top:2px solid #e0e0e0;">
                <td style="padding-top:12px;font-weight:700;font-size:16px;">Total Due</td>
                <td style="padding-top:12px;text-align:right;font-weight:700;font-size:20px;color:#0F6E56;">${data.amount}</td>
              </tr>
            </table>
          </div>
          ${data.paymentUrl ? `
          <div style="text-align:center;">
            <a href="${data.paymentUrl}" style="background:#0F6E56;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
              Pay ${data.amount}
            </a>
          </div>` : ''}
        `,
        footer: 'AfriBot Agency OS · Billing',
      }),
    });
  }
}

// ── HTML template wrapper ─────────────────────────────────────────────────────
function template(opts: { title: string; preheader: string; body: string; footer: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr>
          <td style="background:#0F6E56;padding:28px 32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:18px;font-weight:bold;">A</span>
              </div>
              <span style="color:white;font-size:18px;font-weight:600;">AfriBot</span>
            </div>
          </td>
        </tr>
        <!-- Title -->
        <tr>
          <td style="padding:32px 32px 0;text-align:center;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#141410;">${opts.title}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:24px 32px 32px;color:#444;font-size:15px;line-height:1.6;">
            ${opts.body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f7;padding:20px 32px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
            ${opts.footer}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
