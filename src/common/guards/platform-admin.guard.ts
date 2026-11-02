import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_ADMIN_KEY } from '../decorators/platform-admin.decorator.js';
import type { AuthUserPayload } from '../interfaces/request.interface.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      PLATFORM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUserPayload }>();
    if (!request.user?.isPlatformAdmin)
      throw new ForbiddenException('Platform administrator access is required');
    return true;
  }
}
