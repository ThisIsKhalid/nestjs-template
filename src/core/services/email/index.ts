import nodemailEmailSender, { SendMailResult } from './nodemailer.js';
import { renderEmailTemplate } from './email-template.service.js';

export * from './email-template.service.js';
export * from './nodemailer.js';
export * from './email.service.js';
export * from './email.module.js';

export interface EmailOptions {
  email: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export interface TemplatedEmailOptions {
  email: string;
  subject: string;
  template: string;
  data?: Record<string, unknown>;
  text?: string;
  from?: string;
}

/**
 * Send an email directly using the configured mail provider (Nodemailer).
 */
export const sendEmail = async ({
  email,
  subject,
  html,
  text,
  from,
}: EmailOptions): Promise<SendMailResult | undefined> => {
  try {
    return await nodemailEmailSender({ email, subject, html, text, from });
  } catch (error) {
    console.error('[sendEmail] Send failed:', (error as Error).message);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

/**
 * Convenience helper to render a template and send the resulting email in one call.
 */
export const sendTemplatedEmail = async ({
  email,
  subject,
  template,
  data,
  text,
  from,
}: TemplatedEmailOptions): Promise<SendMailResult | undefined> => {
  try {
    const html = await renderEmailTemplate(template, data);
    return await sendEmail({ email, subject, html, text, from });
  } catch (error) {
    console.error(
      `[sendTemplatedEmail] Failed sending template "${template}" to ${email}:`,
      error,
    );
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};
