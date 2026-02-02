import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const user = this.configService.getOrThrow<string>(ENVEnum.MAIL_USER);
    // const pass = this.configService.getOrThrow<string>(ENVEnum.MAIL_PASS);
    const host =
      this.configService.get<string>(ENVEnum.MAIL_HOST) ?? '127.0.0.1';
    const port = this.configService.get<string>(ENVEnum.MAIL_PORT) ?? '1025';

    this.fromEmail = user;
    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: false,
      // auth: { user, pass }, // Remove auth to prevent sender override in local dev
    });
  }

  public async sendMail({
    to,
    from,
    subject,
    html,
    text,
  }: {
    to: string;
    from?: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<nodemailer.SentMessageInfo> {
    const sender = from || `"No Reply" <${this.fromEmail}>`;
    this.logger.log(`Sending mail from: ${sender} TO: ${to}`);

    return this.transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
      text,
    });
  }
}
