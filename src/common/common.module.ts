import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../core/services/redis/redis.module.js';
import { PrismaService } from '../core/services/database/prisma.service.js';
import { QueuesModule } from '../core/services/queues/queues.module.js';
import { EmailModule } from '../core/services/email/email.module.js';
import { CronModule } from '../core/services/cron/cron.module.js';

import { ResponseService } from './interceptors/response.interceptor.js';

@Global()
@Module({
  imports: [RedisModule, QueuesModule, EmailModule, CronModule],
  providers: [PrismaService, ResponseService],
  exports: [
    PrismaService,
    RedisModule,
    ResponseService,
    QueuesModule,
    EmailModule,
    CronModule,
  ],
})
export class CommonModule {}
