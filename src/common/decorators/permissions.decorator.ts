import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '../constants/permissions.constant.js';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: (PermissionKey | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
