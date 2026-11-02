/**
 * Normalizes a phone number (specifically Bangladesh numbers) to standard E.164 (+8801XXXXXXXXX)
 */
export function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-()]/g, '').trim();

  // Local BD format: 017XXXXXXXX -> +88017XXXXXXXX
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return `+88${cleaned}`;
  }

  // BD format without leading plus: 88017XXXXXXXX -> +88017XXXXXXXX
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Standard E.164 format: +88017XXXXXXXX
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}
