import { PrismaService } from '@/lib/prisma/prisma.service';
import { Controller, Get, Param, Render } from '@nestjs/common';
import { MailboxType } from '@prisma';

@Controller('dev')
export class WebController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mailbox/:email')
  @Render('mailbox')
  async getMailbox(@Param('email') email: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: {
        mailboxes: {
          where: { type: MailboxType.INBOX },
          include: {
            emails: {
              orderBy: { createdAt: 'desc' },
              include: { recipients: true }, // To get "From" if possible, otherwise we infer
            },
          },
        },
      },
    });

    if (!user || user.mailboxes.length === 0) {
      return { email, messages: [] };
    }

    const inbox = user.mailboxes[0];
    const messages = inbox.emails.map((email) => ({
      subject: email.subject,
      text: email.bodyText,
      date: email.date.toLocaleString(),
      from: 'System', // Since we don't strictly parse "From" into a relation yet, simplification for Dev UI
    }));

    return { email, messages };
  }
}
