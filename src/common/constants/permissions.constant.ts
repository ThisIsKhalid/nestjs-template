import { TenantRole } from '@prisma/client';

export const PERMISSIONS = {
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  MEMBER_READ: 'member:read',
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE: 'member:update',
  MEMBER_REMOVE: 'member:remove',
  ROLE_READ: 'role:read',
  ROLE_ASSIGN: 'role:assign',
  PARTICIPANT_SELF_READ: 'participant:self:read',
  PARTICIPANT_SELF_UPDATE: 'participant:self:update',
  PARTICIPANT_READ: 'participant:read',
  PARTICIPANT_CREATE: 'participant:create',
  PARTICIPANT_UPDATE: 'participant:update',
  PARTICIPANT_DELETE: 'participant:delete',
  BROKER_READ: 'broker:read',
  BROKER_CREATE: 'broker:create',
  BROKER_UPDATE: 'broker:update',
  BROKER_DELETE: 'broker:delete',
  SUPERVISOR_READ: 'supervisor:read',
  SUPERVISOR_MANAGE: 'supervisor:manage',
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Fixed role-to-permission grants. Change through code review and deployment. */
export const ROLE_PERMISSIONS: Record<TenantRole, readonly PermissionKey[]> = {
  [TenantRole.ADMINISTRATOR]: Object.values(PERMISSIONS),
  [TenantRole.BROKER]: [
    PERMISSIONS.PARTICIPANT_READ,
    PERMISSIONS.PARTICIPANT_CREATE,
    PERMISSIONS.PARTICIPANT_UPDATE,
    PERMISSIONS.BROKER_READ,
    PERMISSIONS.BROKER_CREATE,
    PERMISSIONS.BROKER_UPDATE,
  ],
  [TenantRole.SUPERVISOR]: [
    PERMISSIONS.PARTICIPANT_READ,
    PERMISSIONS.PARTICIPANT_UPDATE,
    PERMISSIONS.BROKER_READ,
    PERMISSIONS.SUPERVISOR_READ,
    PERMISSIONS.SUPERVISOR_MANAGE,
  ],
  [TenantRole.BILLING_STAFF]: [
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,
  ],
  [TenantRole.PARTICIPANT]: [
    PERMISSIONS.PARTICIPANT_SELF_READ,
    PERMISSIONS.PARTICIPANT_SELF_UPDATE,
  ],
};
