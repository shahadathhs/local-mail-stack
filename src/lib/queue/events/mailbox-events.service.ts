import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { MailboxSetupPayload } from '@/common/interface/queue.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';

@Injectable()
export class MailboxEventsService {
  private readonly logger = new Logger(MailboxEventsService.name);

  constructor(
    @InjectQueue(QueueName.MAILBOX)
    private readonly mailboxQueue: Queue,
  ) {}

  @OnEvent(QueueEventsEnum.MAILBOX_SETUP)
  async handleMailboxSetup(payload: MailboxSetupPayload) {
    this.logger.log(`Adding setup job for user ${payload.email} to queue`);

    try {
      await this.mailboxQueue.add('SETUP_MAILBOXES', payload);
    } catch (err) {
      this.logger.error(
        `Failed to add setup job for ${payload.email}`,
        (err as Error).stack,
      );
    }
  }
}
