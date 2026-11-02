import type { Request } from 'express';

export function cleanIp(ip?: string | null): string {
  if (!ip) return '';
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  if (cleaned === '::1') {
    cleaned = '127.0.0.1';
  }
  return cleaned;
}

export function isPrivateIp(ip?: string | null): boolean {
  if (!ip) return false;
  const clean = cleanIp(ip);
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') {
    return true;
  }
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) {
    return true;
  }
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Extract the true client IP from request headers (Cloudflare, AWS CloudFront, Nginx reverse proxy).
 */
export function extractClientIp(req: Request): string {
  // 1. Check X-Forwarded-For header (comma-separated list of IPs)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw =
      typeof forwarded === 'string'
        ? forwarded
        : Array.isArray(forwarded)
          ? forwarded[0]
          : '';
    const parts = raw
      .split(',')
      .map((p) => cleanIp(p))
      .filter(Boolean);
    // Prefer first public IP in chain
    const publicIp = parts.find((ip) => !isPrivateIp(ip));
    if (publicIp) return publicIp;
    if (parts.length > 0) return parts[0];
  }

  // 2. Check vendor proxy headers (Cloudflare, Fastly, GCP, Nginx)
  const proxyHeaders = [
    req.headers['cf-connecting-ip'],
    req.headers['x-real-ip'],
    req.headers['true-client-ip'],
    req.headers['x-client-ip'],
    req.headers['fastly-client-ip'],
  ];

  for (const headerVal of proxyHeaders) {
    if (headerVal && typeof headerVal === 'string') {
      const cleaned = cleanIp(headerVal.split(',')[0]);
      if (cleaned) return cleaned;
    }
  }

  // 3. Fallback to Express request.ip or socket remote address
  if (req.ip) {
    return cleanIp(req.ip);
  }

  if (req.socket?.remoteAddress) {
    return cleanIp(req.socket.remoteAddress);
  }

  return '127.0.0.1';
}

/**
 * Extract geographic location headers from CDN proxies if available.
 */
export function extractClientLocation(req: Request): string | undefined {
  const city = (req.headers['x-vercel-ip-city'] ||
    req.headers['cf-ipcity'] ||
    req.headers['x-appengine-city']) as string;
  const country = (req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-appengine-country'] ||
    req.headers['x-country-code']) as string;
  const region = (req.headers['x-vercel-ip-country-region'] ||
    req.headers['cf-region']) as string;

  if (city && country) {
    return `${decodeURIComponent(city)}, ${decodeURIComponent(country)}`;
  }
  if (city && region) {
    return `${decodeURIComponent(city)}, ${decodeURIComponent(region)}`;
  }
  if (city) return decodeURIComponent(city);
  if (country) return decodeURIComponent(country);
  return undefined;
}
