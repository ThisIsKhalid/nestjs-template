import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service.js';

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [CronService],
  exports: [ScheduleModule, CronService],
})
export class CronModule {}
