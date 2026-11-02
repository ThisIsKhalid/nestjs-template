import { Injectable } from '@nestjs/common';
import { TenantRole } from '@prisma/client';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class TenantProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a workspace and give its subscribing owner the fixed Administrator role. */
  async createTenant(input: { name: string; slug: string; ownerUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: input.name, slug: input.slug },
      });
      await tx.membership.create({
        data: {
          userId: input.ownerUserId,
          tenantId: tenant.id,
          role: TenantRole.ADMINISTRATOR,
        },
      });
      return tenant;
    });
  }
}
