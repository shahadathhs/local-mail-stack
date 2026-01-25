import { QueueName } from '@/common/enum/queue-name.enum';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GenericPayload } from '../interface/generic.payload';
@Processor(QueueName.GENERIC, { concurrency: 5 })
export class GenericWorkerService extends WorkerHost {
  private readonly logger = new Logger(GenericWorkerService.name);

  constructor() {
    super();
  }

  async process(job: Job<GenericPayload>): Promise<void> {
    const { adminId } = job.data;

    this.logger.log(`Processing job ${job.id} for admin ${adminId}`);

    try {
      // ✅ Replace with actual job logic in specific projects
      // e.g., sync, update, external API call, etc.

      // Generic admin notification
      this.logger.log(`Job ${job.id} logic would go here`);
    } catch (err) {
      this.logger.error(
        `Job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err; // allows retry/backoff
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(`Job ${job.id} failed: ${err?.message}`);
  }
}
