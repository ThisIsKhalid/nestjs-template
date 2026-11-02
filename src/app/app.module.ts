import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { CommonModule } from '../common/common.module.js';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter.js';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppLoggerModule } from '../core/services/logger/logger.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // 100 req/min default, override per-route
    AppLoggerModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
