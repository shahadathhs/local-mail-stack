import { ENVEnum } from '@/common/enum/env.enum';
import { FileService } from '@/lib/file/services/file.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailFlag, MailboxType, RecipientRole } from '@prisma';
import { ParsedMail, simpleParser } from 'mailparser';
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
    _auth: any,
    _session: SMTPServerSession,
    callback: (err: Error | null, response?: any) => void,
  ) {
    // For local dev, accept any auth
    callback(null, { user: _auth.username });
  }

  private async handleData(
    stream: SMTPServerDataStream,
    _session: SMTPServerSession,
    callback: (err: Error | null, response?: any) => void,
  ) {
    try {
      const parsed = await simpleParser(stream);
      this.logger.log(
        `Received email: "${parsed.subject}" from "${parsed.from?.text}"`,
      );

      // Robust address extraction helper
      const getAddresses = (obj: any) => {
        if (!obj || !obj.value) return [];
        const items = Array.isArray(obj.value) ? obj.value : [obj.value];
        return items
          .map((i: any) => ({
            address: i.address?.toLowerCase().trim(),
            name: i.name || '',
          }))
          .filter((i: any) => !!i.address);
      };

      const fromList = getAddresses(parsed.from);
      const toList = getAddresses(parsed.to);
      const ccList = getAddresses(parsed.cc);
      const bccList = getAddresses(parsed.bcc);

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

      // 1. Deliver to each recipient's INBOX
      const recipients = [...toList, ...ccList, ...bccList];
      for (const recipient of recipients) {
        if (!recipient.address) continue;
        await this.saveToUserFolder(
          recipient.address,
          MailboxType.INBOX,
          parsed,
          attachmentIds,
          stream.byteLength,
          fromList,
          toList,
          ccList,
        );
      }

      // 2. Archive in sender's SENT folder if local user
      if (fromList.length > 0 && fromList[0].address) {
        const fromAddress = fromList[0].address;
        await this.saveToUserFolder(
          fromAddress,
          MailboxType.SENT,
          parsed,
          attachmentIds,
          stream.byteLength,
          fromList,
          toList,
          ccList,
        );
      }

      callback(null);
    } catch (err) {
      this.logger.error('SMTP internal processing error', err);
      callback(new Error('Internal Server Error'));
    }
  }

  private async saveToUserFolder(
    email: string,
    folderType: MailboxType,
    parsed: ParsedMail,
    attachmentIds: string[],
    size: number,
    fromList: any[],
    toList: any[],
    ccList: any[],
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: { mailboxes: true },
    });

    if (!user) return; // Not a local user

    const mailbox = user.mailboxes.find((m: any) => m.type === folderType);
    if (!mailbox) {
      this.logger.warn(`Mailbox ${folderType} not found for user ${email}`);
      return;
    }

    // Role-based recipient mapping
    const dbRecipients = [
      ...fromList.map((f) => ({
        address: f.address,
        name: f.name,
        role: RecipientRole.FROM,
      })),
      ...toList.map((t) => ({
        address: t.address,
        name: t.name,
        role: RecipientRole.TO,
      })),
      ...ccList.map((c) => ({
        address: c.address,
        name: c.name,
        role: RecipientRole.CC,
      })),
    ];

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
          create: dbRecipients,
        },
        attachments: {
          connect: attachmentIds.map((id) => ({ id })),
        },
      },
    });

    this.logger.log(`Email saved to ${folderType} for user ${user.email}`);
  }
}
