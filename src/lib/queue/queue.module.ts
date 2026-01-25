import { QueueName } from '@/common/enum/queue-name.enum';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { MailboxEventsService } from './events/mailbox-events.service';
import { MailboxSetupWorker } from './worker/mailbox-setup.worker';

@Global()
@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueName.NOTIFICATION },
      { name: QueueName.MAILBOX },
    ),
  ],
  providers: [MailboxSetupWorker, MailboxEventsService],
  exports: [MailboxSetupWorker, MailboxEventsService],
})
export class QueueModule {}
