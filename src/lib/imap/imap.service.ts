import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as net from 'net';

@Injectable()
export class ImapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ImapService.name);
  private server: net.Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap() {
    const port = this.configService.get<number>(ENVEnum.IMAP_PORT) || 143;
    this.server = net.createServer((socket) => this.handleConnection(socket));
    this.server.listen(port, () => {
      this.logger.log(`IMAP Server listening on port ${port}`);
    });
  }

  private handleConnection(socket: net.Socket) {
    const remoteAddress = socket.remoteAddress + ':' + socket.remotePort;
    this.logger.debug(`New IMAP connection from ${remoteAddress}`);

    let state = 'NON_AUTHENTICATED';
    let user: any = null;
    let selectedMailbox: any = null;

    socket.write(
      '* OK [CAPABILITY IMAP4rev1 AUTH=PLAIN] Local Mail Server Ready\r\n',
    );

    let buffer = '';
    socket.on('data', async (data) => {
      buffer += data.toString();
      while (buffer.includes('\r\n')) {
        const line = buffer.substring(0, buffer.indexOf('\r\n')).trim();
        buffer = buffer.substring(buffer.indexOf('\r\n') + 2);

        if (!line) continue;

        const parts = line.split(' ');
        const tag = parts[0];
        const cmd = parts[1]?.toUpperCase();
        const args = parts.slice(2);

        this.logger.debug(`IMAP Client (${tag}): ${cmd} ${args.join(' ')}`);

        try {
          switch (cmd) {
            case 'CAPABILITY':
              socket.write(`* CAPABILITY IMAP4rev1 AUTH=PLAIN\r\n`);
              socket.write(`${tag} OK CAPABILITY completed\r\n`);
              break;

            case 'LOGIN':
              const email = args[0]?.replace(/"/g, '');
              const password = args[1]?.replace(/"/g, '');

              const dbUser = await this.prisma.client.user.findUnique({
                where: { email },
              });

              if (dbUser && (await bcrypt.compare(password, dbUser.password))) {
                user = dbUser;
                state = 'AUTHENTICATED';
                socket.write(
                  `${tag} OK [CAPABILITY IMAP4rev1] LOGIN completed\r\n`,
                );
              } else {
                socket.write(`${tag} NO LOGIN failed\r\n`);
              }
              break;

            case 'LIST':
              if (state !== 'AUTHENTICATED') {
                socket.write(`${tag} NO Authenticate first\r\n`);
                break;
              }
              const mailboxes = await this.prisma.client.mailbox.findMany({
                where: { userId: user.id },
              });
              for (const mb of mailboxes) {
                socket.write(`* LIST (\\HasNoChildren) "/" "${mb.name}"\r\n`);
              }
              socket.write(`${tag} OK LIST completed\r\n`);
              break;

            case 'SELECT':
              if (state !== 'AUTHENTICATED') {
                socket.write(`${tag} NO Authenticate first\r\n`);
                break;
              }
              const mbName = args[0]?.replace(/"/g, '');
              const mailbox = await this.prisma.client.mailbox.findFirst({
                where: { userId: user.id, name: mbName },
              });

              if (mailbox) {
                selectedMailbox = mailbox;
                const count = await this.prisma.client.email.count({
                  where: { mailboxId: mailbox.id },
                });
                socket.write(`* ${count} EXISTS\r\n`);
                socket.write(
                  `* OK [UIDVALIDITY ${mailbox.uidValidity}] UIDs valid\r\n`,
                );
                socket.write(`${tag} OK [READ-WRITE] SELECT completed\r\n`);
              } else {
                socket.write(`${tag} NO Mailbox not found\r\n`);
              }
              break;

            case 'FETCH':
              if (!selectedMailbox) {
                socket.write(`${tag} NO Select a mailbox first\r\n`);
                break;
              }

              const range = args[0];
              const emails = await this.prisma.client.email.findMany({
                where: { mailboxId: selectedMailbox.id },
                orderBy: { createdAt: 'asc' },
                include: { recipients: true },
              });

              emails.forEach((email, index) => {
                const seq = index + 1;
                // Basic range support (1:* or explicit sequence)
                if (range === '1:*' || range === seq.toString()) {
                  let body = `From: ${email.recipients.find((r) => r.role === 'FROM')?.address || 'unknown'}\r\n`;
                  body += `Subject: ${email.subject}\r\n\r\n`;
                  body += email.bodyText || '';

                  socket.write(
                    `* ${seq} FETCH (BODY[] {${body.length}}\r\n${body})\r\n`,
                  );
                }
              });
              socket.write(`${tag} OK FETCH completed\r\n`);
              break;

            case 'LOGOUT':
              socket.write(`* BYE Local Mail Server signing off\r\n`);
              socket.write(`${tag} OK LOGOUT completed\r\n`);
              socket.end();
              break;

            default:
              socket.write(`${tag} BAD Unknown command\r\n`);
          }
        } catch (err) {
          this.logger.error(`IMAP Error: ${err.message}`, err.stack);
          socket.write(`${tag} NO Internal error\r\n`);
        }
      }
    });

    socket.on('error', (err) => {
      this.logger.error(`IMAP connection error: ${err.message}`);
    });

    socket.on('close', () => {
      this.logger.debug(`IMAP connection closed from ${remoteAddress}`);
    });
  }
}
