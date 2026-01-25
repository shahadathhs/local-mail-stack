import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  UnauthorizedException,
} from '@nestjs/common';
import { MailboxType } from '@prisma';

interface MailboxMessage {
  id: string;
  subject: string;
  text: string;
  html: string;
  date: string;
  from: string;
  to: string;
}

@Controller('dev')
export class WebController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
  ) {}

  @Get('mailbox/:email')
  @Render('mailbox')
  async getMailbox(
    @Param('email') email: string,
    @Query('sig') sig: string,
    @Query('folder') folder: string = 'INBOX',
  ) {
    if (!this.utils.verifyMailboxUrlSignature(email, sig)) {
      throw new UnauthorizedException(
        'Invalid or missing signature for Dev Mailbox',
      );
    }

    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: {
        mailboxes: {
          include: {
            _count: {
              select: { emails: true },
            },
          },
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!user || user.mailboxes.length === 0) {
      return { email, mailboxes: [], messages: [], currentFolder: folder };
    }

    // Find the currently selected mailbox
    const currentMailbox =
      user.mailboxes.find((m) => m.name === folder || m.type === folder) ||
      user.mailboxes.find((m) => m.type === MailboxType.INBOX);

    let messages: MailboxMessage[] = [];
    if (currentMailbox) {
      const emails = await this.prisma.client.email.findMany({
        where: { mailboxId: currentMailbox.id },
        orderBy: { createdAt: 'desc' },
        include: { recipients: true },
      });

      messages = emails.map((email) => ({
        id: email.id,
        subject: email.subject ?? 'No Subject',
        text: email.bodyText ?? '',
        html: email.bodyHtml ?? '',
        date: email.date.toLocaleString(),
        from:
          email.recipients.find((r) => r.role === 'FROM')?.address || 'Unknown',
        to: email.recipients
          .filter((r) => r.role === 'TO')
          .map((r) => r.address)
          .join(', '),
      }));
    }

    // Prepare sidebar data
    const mailboxes = user.mailboxes.map((m) => ({
      name: m.name,
      type: m.type,
      count: m._count.emails,
      active: m.id === currentMailbox?.id,
      url: `${this.utils.createSignedMailboxUrl(email)}&folder=${m.name}`,
    }));

    // We need to pass the base signed URL for links to work without regenerating every time
    // Actually, createSignedMailboxUrl returns the full URL with query param ?sig=...
    // So we can append &folder=... safely.

    return {
      email,
      mailboxes,
      messages,
      currentFolder: currentMailbox?.name || folder,
      devMailboxUrl: this.utils.createSignedMailboxUrl(email), // Pass base URL for resets
    };
  }
}
