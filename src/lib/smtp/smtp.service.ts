import { ENVEnum } from '@/common/enum/env.enum';
import { FileService } from '@/lib/file/services/file.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailFlag, MailboxType, RecipientRole } from '@prisma';
import { simpleParser } from 'mailparser';
import {
  SMTPServer,
  SMTPServerDataStream,
  SMTPServerSession,
} from 'smtp-server';

@Injectable()
export class SmtpService implements OnApplicationBootstrap {
  private server: SMTPServer;
  private readonly logger = new Logger(SmtpService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
  ) {
    this.server = new SMTPServer({
      authOptional: true, // Allow local dev without strict auth
      disabledCommands: ['STARTTLS'], // Simple local setup
      onData: this.handleData.bind(this),
      onAuth: this.handleAuth.bind(this),
    });
  }

  onApplicationBootstrap() {
    const port = this.configService.get<number>(ENVEnum.MAIL_PORT) || 1025;
    this.server.listen(port, () => {
      this.logger.log(`SMTP Server listening on port ${port}`);
    });
  }

  private handleAuth(
    auth: any,
    session: SMTPServerSession,
    callback: (err: Error | null, response?: any) => void,
  ) {
    // For local dev, accept any auth
    callback(null, { user: auth.username });
  }

  private async handleData(
    stream: SMTPServerDataStream,
    session: SMTPServerSession,
    callback: (err: Error | null, response?: any) => void,
  ) {
    try {
      const parsed = await simpleParser(stream);

      this.logger.log(
        `Received email: ${parsed.subject} from ${parsed.from?.text}`,
      );

      // Extract recipients
      const recipients = [
        ...(parsed.to
          ? Array.isArray(parsed.to)
            ? parsed.to
            : [parsed.to]
          : []),
        ...(parsed.cc
          ? Array.isArray(parsed.cc)
            ? parsed.cc
            : [parsed.cc]
          : []),
        ...(parsed.bcc
          ? Array.isArray(parsed.bcc)
            ? parsed.bcc
            : [parsed.bcc]
          : []),
      ];

      // Process attachments once for this email
      const attachmentIds: string[] = [];
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          try {
            const savedFile = await this.fileService.saveFileFromBuffer(
              attachment.content,
              attachment.filename || 'unnamed-attachment',
              attachment.contentType,
            );
            attachmentIds.push(savedFile.id);
          } catch (err) {
            this.logger.error(
              `Failed to save attachment ${attachment.filename}`,
              err,
            );
          }
        }
      }

      // Save for each local recipient
      for (const recipient of recipients) {
        if (!recipient.text) continue;
        const address = recipient.text.replace(/.*<(.+)>$/, '$1');
        await this.saveToUserFolder(
          address,
          MailboxType.INBOX,
          parsed,
          attachmentIds,
          stream.byteLength,
        );
      }

      // Save to sender's SENT folder if it's a local user
      if (parsed.from?.text) {
        const fromAddress = parsed.from.text.replace(/.*<(.+)>$/, '$1');
        await this.saveToUserFolder(
          fromAddress,
          MailboxType.SENT,
          parsed,
          attachmentIds,
          stream.byteLength,
        );
      }

      callback(null);
    } catch (err) {
      this.logger.error('Error processing incoming email', err);
      callback(new Error('Internal Server Error'));
    }
  }

  private async saveToUserFolder(
    email: string,
    folderType: MailboxType,
    parsed: any,
    attachmentIds: string[],
    size: number,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: { mailboxes: true },
    });

    if (!user) return;

    const mailbox = user.mailboxes.find((m: any) => m.type === folderType);
    if (!mailbox) return;

    await this.prisma.client.email.create({
      data: {
        mailboxId: mailbox.id,
        subject: parsed.subject || '(No Subject)',
        bodyText: parsed.text,
        bodyHtml: parsed.html as string,
        messageId: parsed.messageId,
        date: parsed.date || new Date(),
        size: size,
        flags: [EmailFlag.RECENT],
        recipients: {
          create: [
            ...(parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to
                : [parsed.to]
              : []),
            ...(parsed.cc
              ? Array.isArray(parsed.cc)
                ? parsed.cc
                : [parsed.cc]
              : []),
            ...(parsed.bcc
              ? Array.isArray(parsed.bcc)
                ? parsed.bcc
                : [parsed.bcc]
              : []),
          ].map((r: any) => ({
            address: r.text,
            name: r.name || '',
            role: RecipientRole.TO, // Simplified
          })),
        },
        attachments: {
          connect: attachmentIds.map((id) => ({ id })),
        },
      },
    });

    this.logger.log(`Email saved to ${folderType} for user ${user.email}`);
  }
}
