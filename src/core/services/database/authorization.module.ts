import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service.js';
import { TenantProvisioningService } from './tenant-provisioning.service.js';

@Module({
  providers: [AuthorizationService, TenantProvisioningService],
  exports: [AuthorizationService, TenantProvisioningService],
})
export class AuthorizationModule {}
