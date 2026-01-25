import { ENVEnum } from '@/common/enum/env.enum';
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

      // Save for each local recipient
      for (const recipient of recipients) {
        if (!recipient.text) continue;

        // Find existing user by email
        // Note: In a real server, we'd check if the domain matches our hosted domains
        // For local stack, we try to match any local user
        const address = recipient.text.replace(/.*<(.+)>$/, '$1'); // clean address

        const user = await this.prisma.client.user.findUnique({
          where: { email: address },
          include: { mailboxes: true },
        });

        if (user) {
          // Find INBOX
          const inbox = user.mailboxes.find(
            (m) => m.type === MailboxType.INBOX,
          );

          if (inbox) {
            await this.prisma.client.email.create({
              data: {
                mailboxId: inbox.id,
                subject: parsed.subject || '(No Subject)',
                bodyText: parsed.text,
                bodyHtml: parsed.html as string, // mailparser types can be tricky
                messageId: parsed.messageId,
                date: parsed.date || new Date(),
                size: stream.byteLength, // Approximation
                flags: [EmailFlag.RECENT],
                recipients: {
                  create: recipients.map((r) => ({
                    address: r.text, // Simplified, ideally parse address object
                    name: '',
                    role: RecipientRole.TO, // Simplified logic
                  })),
                },
              },
            });
            this.logger.log(`Email saved to INBOX for user ${user.email}`);
          }
        }
      }

      callback(null);
    } catch (err) {
      this.logger.error('Error processing incoming email', err);
      callback(new Error('Internal Server Error'));
    }
  }
}
