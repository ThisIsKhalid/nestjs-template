import { SetMetadata } from '@nestjs/common';
export const PLATFORM_ADMIN_KEY = 'platform-admin-only';
/** Mark an endpoint as platform-operator only. */
export const RequirePlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);
