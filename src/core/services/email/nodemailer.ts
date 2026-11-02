import nodemailer from 'nodemailer';
import type { Transporter, SentMessageInfo } from 'nodemailer';
import config from '../../../config/index.js';

export interface SendMailOptions {
  email: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
}

let transporterInstance: Transporter | null = null;

/**
 * Creates or retrieves the cached Nodemailer transporter based on current application config.
 */
export const getTransporter = (): Transporter => {
  if (transporterInstance) {
    return transporterInstance;
  }

  const { smtp } = config;

  if (smtp.service) {
    transporterInstance = nodemailer.createTransport({
      service: smtp.service,
      auth: {
        user: smtp.user || '',
        pass: smtp.pass || '',
      },
    });
  } else {
    transporterInstance = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth:
        smtp.user && smtp.pass
          ? {
              user: smtp.user,
              pass: smtp.pass,
            }
          : undefined,
    });
  }

  return transporterInstance;
};

/**
 * Send an email using Nodemailer.
 */
export const nodemailEmailSender = async ({
  email,
  subject,
  html = '',
  text,
  from,
}: SendMailOptions): Promise<SendMailResult> => {
  const sender =
    from ||
    `"${config.company_name || config.companyName || 'E-Commerce'}" <${
      config.smtp.sender || 'noreply@ecommerce.local'
    }>`;

  const mailOptions = {
    from: sender,
    to: email,
    subject,
    html,
    ...(text ? { text } : {}),
  };

  try {
    const transporter = getTransporter();
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    if (config.isDevelopment || config.logVerbose) {
      console.log(
        `[Email] Successfully sent to ${email}. Response: ${info.response || info.messageId}`,
      );
    }
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[Email] Failed sending to ${email}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

export default nodemailEmailSender;
