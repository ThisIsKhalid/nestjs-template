import {
  Controller,
  Get,
  Inject,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../core/services/database/prisma.service.js';
import { REDIS_CLIENT } from '../core/services/redis/redis.module.js';
import type { Redis } from 'ioredis';

@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('health/live')
  live() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    const checks = {
      database: database.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    } as const;
    const isReady =
      database.status === 'fulfilled' && redis.status === 'fulfilled';

    response.status(isReady ? 200 : 503);
    return {
      status: isReady ? 'ok' : 'error',
      checks,
    };
  }
}
