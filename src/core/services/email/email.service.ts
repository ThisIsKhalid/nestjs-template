import { Injectable, Logger } from '@nestjs/common';
import {
  sendEmail,
  sendTemplatedEmail,
  EmailOptions,
  TemplatedEmailOptions,
} from './index.js';
import {
  renderEmailTemplate,
  renderWelcomeEmail,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderOrderConfirmationEmail,
  renderOrderStatusEmail,
  renderPasswordChangedEmail,
} from './email-template.service.js';
import type { SendMailResult } from './nodemailer.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendMail(options: EmailOptions): Promise<SendMailResult | undefined> {
    return sendEmail(options);
  }

  async sendTemplatedMail(
    options: TemplatedEmailOptions,
  ): Promise<SendMailResult | undefined> {
    return sendTemplatedEmail(options);
  }

  async sendWelcome(
    email: string,
    data: { name: string; exploreUrl?: string; supportUrl?: string },
  ) {
    const html = await renderWelcomeEmail(data);
    return sendEmail({
      email,
      subject: 'Welcome to our store!',
      html,
    });
  }

  async sendVerification(
    email: string,
    data: {
      name: string;
      verificationUrl?: string;
      verificationCode?: string;
      expiresIn?: number;
    },
  ) {
    const html = await renderVerificationEmail(data);
    return sendEmail({
      email,
      subject: 'Verify your email address',
      html,
    });
  }

  async sendPasswordReset(
    email: string,
    data: {
      name: string;
      email: string;
      resetUrl?: string;
      resetCode?: string;
      expiresIn?: number;
    },
  ) {
    const html = await renderPasswordResetEmail(data);
    return sendEmail({
      email,
      subject: 'Password reset request',
      html,
    });
  }

  async sendOrderConfirmation(
    email: string,
    data: Parameters<typeof renderOrderConfirmationEmail>[0],
  ) {
    const html = await renderOrderConfirmationEmail(data);
    return sendEmail({
      email,
      subject: `Order Confirmation #${data.orderNumber}`,
      html,
    });
  }

  async sendOrderStatus(
    email: string,
    data: Parameters<typeof renderOrderStatusEmail>[0],
  ) {
    const html = await renderOrderStatusEmail(data);
    return sendEmail({
      email,
      subject: `Update on Order #${data.orderNumber}: ${data.orderStatus}`,
      html,
    });
  }

  async sendPasswordChangedAlert(
    email: string,
    data: Parameters<typeof renderPasswordChangedEmail>[0],
  ) {
    const html = await renderPasswordChangedEmail(data);
    return sendEmail({
      email,
      subject: 'Security Alert: Password Changed',
      html,
    });
  }

  async render(templateName: string, data: Record<string, unknown> = {}) {
    return renderEmailTemplate(templateName, data);
  }
}
