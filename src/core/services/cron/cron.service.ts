import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

export interface CronJobInfo {
  name: string;
  nextDate: Date | null;
  running: boolean;
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  /**
   * Retrieves status and next execution timestamp of all registered cron jobs.
   */
  getCronJobs(): CronJobInfo[] {
    const jobs = this.schedulerRegistry.getCronJobs();
    const result: CronJobInfo[] = [];

    jobs.forEach((job, name) => {
      let nextDate: Date | null = null;
      try {
        const next = job.nextDate();
        nextDate = next ? next.toJSDate() : null;
      } catch {
        // Next date calculation might fail if job is not active or invalid
      }

      result.push({
        name,
        nextDate,
        running: (job as any).running ?? true,
      });
    });

    return result;
  }

  /**
   * Manually triggers a registered cron job by its identifier name.
   */
  async triggerCronJob(name: string): Promise<void> {
    const job = this.schedulerRegistry.getCronJob(name);
    if (!job) {
      throw new NotFoundException(`Cron job "${name}" not found`);
    }

    this.logger.log(`Manually triggering cron job: ${name}`);
    await (job as any).fireOnTick?.();
  }

  /**
   * Pauses an active cron job.
   */
  pauseCronJob(name: string): void {
    const job = this.schedulerRegistry.getCronJob(name);
    if (!job) {
      throw new NotFoundException(`Cron job "${name}" not found`);
    }
    job.stop();
    this.logger.log(`Paused cron job: ${name}`);
  }

  /**
   * Resumes a paused cron job.
   */
  resumeCronJob(name: string): void {
    const job = this.schedulerRegistry.getCronJob(name);
    if (!job) {
      throw new NotFoundException(`Cron job "${name}" not found`);
    }
    job.start();
    this.logger.log(`Resumed cron job: ${name}`);
  }
}
