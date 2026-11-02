import { ForbiddenException } from '@nestjs/common';

/** Always override client-supplied tenant filters with the authenticated tenant. */
export function tenantWhere<T extends object>(
  tenantId: string | undefined,
  where: T = {} as T,
) {
  if (!tenantId)
    throw new ForbiddenException('An active tenant context is required');
  return { ...where, tenantId };
}

/** Restrict tenant member records to the authenticated user where applicable. */
export function tenantOwnerWhere<T extends object>(
  tenantId: string | undefined,
  userId: string | undefined,
  where: T = {} as T,
) {
  if (!tenantId || !userId)
    throw new ForbiddenException('An active tenant membership is required');
  return { ...where, tenantId, userId };
}
