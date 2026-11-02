import * as fs from 'fs/promises';
import * as path from 'path';
import config from '../../../config/index.js';

// Cache loaded template strings in memory
const templateCache = new Map<string, string>();

/**
 * Resolve the template directory across local development, NestJS dist, or root assets.
 */
export const getTemplateDir = async (): Promise<string> => {
  const candidateDirs = [
    path.join(process.cwd(), 'src', 'assets', 'email_templates'),
    path.join(process.cwd(), 'dist', 'src', 'assets', 'email_templates'),
    path.join(process.cwd(), 'dist', 'assets', 'email_templates'),
  ];

  for (const dir of candidateDirs) {
    try {
      await fs.access(dir);
      return dir;
    } catch {
      // continue checking other candidates
    }
  }

  // Default fallback to src/assets/email_templates
  return candidateDirs[0];
};

/**
 * Minimal, zero-dependency template compiler for HTML emails.
 * Supports:
 * - Simple variable interpolation: {{name}}, {{user.email}}
 * - Conditional blocks: {{#if isVerified}}...{{/if}}
 */
export const compileTemplate = (
  template: string,
  data: Record<string, unknown> = {},
): string => {
  // 1. Process conditional blocks: {{#if key}}content{{/if}}
  let rendered = template.replace(
    /{{#if\s+([a-zA-Z0-9_.]+)}}\s*([\s\S]*?)\s*{{\/if}}/g,
    (_, conditionKey, innerContent) => {
      const val = getNestedValue(data, conditionKey.trim());
      return val ? innerContent : '';
    },
  );

  // 2. Process variable placeholders: {{key}}
  rendered = rendered.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (match, key) => {
    const val = getNestedValue(data, key.trim());
    return val !== undefined && val !== null ? String(val) : '';
  });

  return rendered;
};

/**
 * Safely retrieve nested values from an object (e.g., 'user.name').
 */
const getNestedValue = (
  obj: Record<string, unknown>,
  pathStr: string,
): unknown => {
  return pathStr.split('.').reduce((acc: unknown, part: string) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

/**
 * Read and render an email template from disk (cached in memory).
 * Automatically provides default values like companyName and current year.
 */
export const renderEmailTemplate = async (
  templateName: string,
  data: Record<string, unknown> = {},
): Promise<string> => {
  const filename = templateName.endsWith('.html')
    ? templateName
    : `${templateName}.html`;

  let templateContent = templateCache.get(filename);
  if (!templateContent) {
    const baseDir = await getTemplateDir();
    const filePath = path.join(baseDir, filename);
    templateContent = await fs.readFile(filePath, 'utf-8');
    templateCache.set(filename, templateContent);
  }

  const defaultContext: Record<string, unknown> = {
    companyName: config.company_name || config.companyName || 'E-Commerce',
    year: new Date().getFullYear().toString(),
    supportUrl: `${config.frontendUrl}/support`,
    exploreUrl: `${config.frontendUrl}/products`,
  };

  return compileTemplate(templateContent, {
    ...defaultContext,
    ...data,
  });
};

/**
 * Pre-typed helper for Welcome Email
 */
export const renderWelcomeEmail = async (data: {
  name: string;
  exploreUrl?: string;
  supportUrl?: string;
}): Promise<string> => {
  return renderEmailTemplate('welcome', data);
};

/**
 * Pre-typed helper for Email Verification
 */
export const renderVerificationEmail = async (data: {
  name: string;
  verificationUrl?: string;
  verificationCode?: string;
  expiresIn?: number;
}): Promise<string> => {
  return renderEmailTemplate('email-verification', {
    expiresIn: 15,
    ...data,
  });
};

/**
 * Pre-typed helper for Password Reset
 */
export const renderPasswordResetEmail = async (data: {
  name: string;
  email: string;
  resetUrl?: string;
  resetCode?: string;
  expiresIn?: number;
}): Promise<string> => {
  return renderEmailTemplate('reset-password', {
    expiresIn: 15,
    ...data,
  });
};

/**
 * Pre-typed helper for Order Confirmation
 */
export const renderOrderConfirmationEmail = async (data: {
  name: string;
  orderNumber: string;
  orderDate?: string;
  items: Array<{ name: string; quantity: number; price: string | number }>;
  subtotal: string | number;
  shipping: string | number;
  discount?: string | number;
  total: string | number;
  shippingAddress?: string;
  orderUrl?: string;
}): Promise<string> => {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td align="center">${item.quantity}</td>
        <td align="right">${item.price}</td>
      </tr>`,
    )
    .join('');

  return renderEmailTemplate('order-confirmation', {
    orderDate: new Date().toLocaleDateString(),
    ...data,
    itemsHtml,
  });
};

/**
 * Pre-typed helper for Order Status Update
 */
export const renderOrderStatusEmail = async (data: {
  name: string;
  orderNumber: string;
  orderStatus: string;
  statusMessage?: string;
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
}): Promise<string> => {
  return renderEmailTemplate('order-status-update', data);
};

/**
 * Pre-typed helper for Password Changed Alert
 */
export const renderPasswordChangedEmail = async (data: {
  name: string;
  email: string;
  changedAt?: string;
  ipAddress?: string;
  secureAccountUrl?: string;
}): Promise<string> => {
  return renderEmailTemplate('password-changed', {
    changedAt: new Date().toUTCString(),
    ...data,
  });
};
