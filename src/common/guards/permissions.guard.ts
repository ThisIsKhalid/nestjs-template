import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route doesn't specify permissions, allow it through
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !Array.isArray(user.permissions)) {
      throw new ForbiddenException(
        'Access denied: No permissions attached to session',
      );
    }

    // Check if user has ALL required permissions
    const missingPermissions = requiredPermissions.filter(
      (perm) => !user.permissions.includes(perm),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Access denied: Missing required permission(s) [${missingPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
