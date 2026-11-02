import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { ROLE_PERMISSIONS } from '../../../common/constants/permissions.constant.js';

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve a fixed tenant role and its permissions from server-side membership data. */
  async resolveTenantUser(userId: string, tenantId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { tenant: true, user: true },
    });
    if (
      !membership ||
      membership.tenant.status !== 'ACTIVE' ||
      membership.user.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException('No active membership exists for this tenant');
    }
    return {
      id: membership.userId,
      tenantId: membership.tenantId,
      membershipId: `${membership.userId}:${membership.tenantId}`,
      role: membership.role,
      isPlatformAdmin: membership.user.platformRole === 'SUPER_ADMIN',
      permissions: [...ROLE_PERMISSIONS[membership.role]],
    };
  }

  /** Resolve the SaaS owner account, which operates outside tenant workspaces. */
  async resolvePlatformAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE' || user.platformRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform administrator access is required');
    }
    return {
      id: user.id,
      isPlatformAdmin: true,
      role: user.platformRole,
      permissions: [],
    };
  }
}
