/**
 * Resend Email Provider Adapter for Cloudflare Workers Edge Runtime
 * Zero native C++ Node.js dependencies. Uses standard fetch and Web Crypto.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  attachments?: {
    filename: string;
    content: string; // Base64
  }[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: 'RESEND';
  responseCode: number;
  error?: string;
  isTransient: boolean;
}

export class ResendAdapter {
  private apiKey: string;
  private defaultFrom: string;
  private defaultReplyTo: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'Advocate A.K. Saravanan <orders@akspropertychecklist.in>';
    this.defaultReplyTo = process.env.RESEND_REPLY_TO || 'chambers@akspropertychecklist.in';
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    // Development / Ephemeral Sandbox Simulation Mode
    if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey.startsWith('demo_') || this.apiKey.startsWith('sim_')) {
      const simulatedId = `sim_resend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        success: true,
        messageId: simulatedId,
        provider: 'RESEND',
        responseCode: 200,
        isTransient: false,
      };
    }

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      };

      if (input.idempotencyKey) {
        headers['Idempotency-Key'] = input.idempotencyKey;
      }

      const payload: Record<string, any> = {
        from: input.from || this.defaultFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text || input.html.replace(/<[^>]*>?/gm, ''),
        reply_to: input.replyTo || this.defaultReplyTo,
      };

      if (input.attachments && input.attachments.length > 0) {
        payload.attachments = input.attachments;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseCode = res.status;
      const data: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        const isTransient = responseCode === 429 || responseCode >= 500;
        return {
          success: false,
          provider: 'RESEND',
          responseCode,
          error: data.message || `Resend HTTP ${responseCode}`,
          isTransient,
        };
      }

      return {
        success: true,
        messageId: data.id,
        provider: 'RESEND',
        responseCode: 200,
        isTransient: false,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'RESEND',
        responseCode: 0,
        error: err.message || 'Network exception connecting to Resend API',
        isTransient: true,
      };
    }
  }
}

export const resendAdapter = new ResendAdapter();

