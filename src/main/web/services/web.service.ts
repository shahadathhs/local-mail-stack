import { MailboxMessage } from '@/common/interface/mailbox.interface';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailFlag, MailboxType } from '@prisma';

@Injectable()
export class WebService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly utils: AuthUtilsService,
  ) {}

  async getMailboxData(email: string, sig: string, folder: string, q?: string) {
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

    const currentMailbox =
      user.mailboxes.find((m) => m.name === folder || m.type === folder) ||
      user.mailboxes.find((m) => m.type === MailboxType.INBOX);

    let messages: MailboxMessage[] = [];
    if (currentMailbox) {
      const where: any = { mailboxId: currentMailbox.id };
      if (q) {
        where.OR = [
          { subject: { contains: q, mode: 'insensitive' } },
          { bodyText: { contains: q, mode: 'insensitive' } },
          {
            recipients: {
              some: { address: { contains: q, mode: 'insensitive' } },
            },
          },
        ];
      }

      const emails = await this.prisma.client.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { recipients: true, attachments: true },
      });

      messages = emails.map((email) => ({
        id: email.id,
        subject: email.subject ?? 'No Subject',
        text: email.bodyText ?? '',
        html: email.bodyHtml ?? '',
        date: email.date.toLocaleString(),
        from:
          email.recipients.find((r: any) => r.role === 'FROM')?.address ||
          'Unknown',
        to: email.recipients
          .filter((r: any) => r.role === 'TO')
          .map((r: any) => r.address)
          .join(', '),
        attachments: email.attachments.map((a: any) => ({
          id: a.id,
          filename: a.originalFilename,
          url: a.url,
          size: a.size,
          mimeType: a.mimeType,
        })),
        isRead: email.flags.includes(EmailFlag.SEEN),
      }));
    }

    const mailboxes = user.mailboxes.map((m) => ({
      name: m.name,
      type: m.type,
      count: m._count.emails,
      active: m.id === currentMailbox?.id,
      url: `${this.utils.createSignedMailboxUrl(email)}&folder=${m.name}`,
    }));

    return {
      email,
      mailboxes,
      messages,
      currentFolder: currentMailbox?.name || folder,
      devMailboxUrl: this.utils.createSignedMailboxUrl(email),
      searchQuery: q || '',
      sig,
    };
  }
}
