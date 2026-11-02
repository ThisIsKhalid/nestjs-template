import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { AuthUserPayload } from '../interfaces/request.interface.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUserPayload }>();
    const user = request.user;
    if (!user || !Array.isArray(user.permissions)) {
      throw new ForbiddenException(
        'Access denied: authenticated permissions are unavailable',
      );
    }
    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException(
        'Access denied: active tenant context is required',
      );
    }
    const missing = required.filter(
      (permission) => !user.permissions.includes(permission),
    );
    if (missing.length) {
      throw new ForbiddenException(
        `Access denied: missing permission(s) [${missing.join(', ')}]`,
      );
    }
    return true;
  }
}
