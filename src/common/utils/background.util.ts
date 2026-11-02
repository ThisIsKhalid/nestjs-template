type Task = () => Promise<void> | void;

interface Job {
  fn: Task;
  retries: number;
}

class BackgroundQueue {
  private queue: Job[] = [];
  private running = 0;

  constructor(
    private concurrency = 4,
    private defaultRetries = 1,
  ) {}

  /**
   * Enqueue a task to be processed asynchronously without blocking the request-response cycle.
   */
  add(fn: Task, retries = this.defaultRetries): void {
    this.queue.push({ fn, retries });
    this.process();
  }

  private process(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      this.running++;

      setImmediate(async () => {
        try {
          await job.fn();
        } catch (err) {
          if (job.retries > 0) {
            job.retries--;
            this.queue.push(job);
          } else {
            console.error('[BackgroundQueue] Task failed permanently:', err);
          }
        } finally {
          this.running--;
          this.process();
        }
      });
    }
  }
}

export const background = new BackgroundQueue(4, 1);
