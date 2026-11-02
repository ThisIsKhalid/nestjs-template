import { SetMetadata } from '@nestjs/common';

export const BYPASS_RESPONSE_KEY = 'bypass_response';

/**
 * Decorator to bypass the global ResponseInterceptor wrapping.
 * Useful for raw binary responses (PDF invoices, CSV exports),
 * Server-Sent Events (SSE), or external webhook responses.
 */
export const BypassResponse = () => SetMetadata(BYPASS_RESPONSE_KEY, true);
