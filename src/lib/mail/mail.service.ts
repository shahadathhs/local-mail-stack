import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const user = this.configService.getOrThrow<string>(ENVEnum.MAIL_USER);
    const pass = this.configService.getOrThrow<string>(ENVEnum.MAIL_PASS);
    const host =
      this.configService.get<string>(ENVEnum.MAIL_HOST) ?? '127.0.0.1';
    const port = this.configService.get<string>(ENVEnum.MAIL_PORT) ?? '1025';

    this.fromEmail = user;
    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: false, // Local servers usually don't need TLS initially
      auth: { user, pass },
    });
  }

  public async sendMail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<nodemailer.SentMessageInfo> {
    return this.transporter.sendMail({
      from: `"No Reply" <${this.fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
  }
}
