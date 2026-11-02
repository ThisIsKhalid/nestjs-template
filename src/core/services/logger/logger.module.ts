import { Global, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { pinoHttpConfig } from './logger.config.js';

@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: pinoHttpConfig,
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
