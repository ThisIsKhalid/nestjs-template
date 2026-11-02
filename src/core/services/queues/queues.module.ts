import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import type { Request, Response, NextFunction } from 'express';
import config from '../../../config/index.js';

export const AUDIT_LOGS_QUEUE = 'audit-logs';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({
      name: AUDIT_LOGS_QUEUE,
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
      middleware: (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          res.setHeader('WWW-Authenticate', 'Basic realm="BullBoard"');
          return res.status(401).send('Authentication required');
        }
        const b64auth = (authHeader || '').split(' ')[1] || '';
        const [login, password] = Buffer.from(b64auth, 'base64')
          .toString()
          .split(':');
        if (
          login === config.bullBoard.user &&
          password === config.bullBoard.password
        ) {
          return next();
        }
        res.setHeader('WWW-Authenticate', 'Basic realm="BullBoard"');
        return res.status(401).send('Invalid credentials');
      },
    }),
    BullBoardModule.forFeature({
      name: AUDIT_LOGS_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
