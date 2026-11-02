import { SkipThrottle } from '@nestjs/throttler';

/**
 * Decorator to skip rate limiting / throttling on specific controller classes or route handlers.
 * Alias for NestJS `@SkipThrottle()`.
 */
export const SkipRateLimit = SkipThrottle;
