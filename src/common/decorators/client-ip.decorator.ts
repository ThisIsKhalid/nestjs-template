import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { extractClientIp } from '../utils/client-ip.util.js';

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return extractClientIp(request);
  },
);
