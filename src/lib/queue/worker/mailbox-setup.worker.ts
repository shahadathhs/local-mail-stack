import { QueueName } from '@/common/enum/queue-name.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MailboxType } from '@prisma';
import { Job } from 'bullmq';

interface MailboxSetupPayload {
  userId: string;
  email: string;
}

@Processor(QueueName.MAILBOX, { concurrency: 5 })
export class MailboxSetupWorker extends WorkerHost {
  private readonly logger = new Logger(MailboxSetupWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<MailboxSetupPayload>): Promise<void> {
    const { userId, email } = job.data;

    // Check if job name matches (since we reuse GENERIC queue)
    if (job.name !== 'SETUP_MAILBOXES') return;

    this.logger.log(`Setting up mailboxes for user ${email} (${userId})`);

    try {
      const mailboxTypes = [
        MailboxType.INBOX,
        MailboxType.SENT,
        MailboxType.DRAFTS,
        MailboxType.TRASH,
        MailboxType.SPAM,
        MailboxType.ARCHIVE,
      ];

      // Create default mailboxes
      await this.prisma.client.mailbox.createMany({
        data: mailboxTypes.map((type) => ({
          userId,
          name: this.getMailboxName(type),
          type,
          uidNext: 1,
          uidValidity: Math.floor(Date.now() / 1000), // Standard UNIX timestamp validity
        })),
        skipDuplicates: true, // Idempotency
      });

      this.logger.log(`Mailboxes created successfully for ${email}`);
    } catch (err) {
      this.logger.error(
        `Failed to setup mailboxes for ${email}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }

  private getMailboxName(type: MailboxType): string {
    switch (type) {
      case MailboxType.INBOX:
        return 'INBOX';
      case MailboxType.SENT:
        return 'Sent';
      case MailboxType.DRAFTS:
        return 'Drafts';
      case MailboxType.TRASH:
        return 'Trash';
      case MailboxType.SPAM:
        return 'Spam';
      case MailboxType.ARCHIVE:
        return 'Archive';
      default:
        return 'Custom';
    }
  }
}
