import { successResponse } from '@/common/utils/response.util';
import { MailService } from '@/lib/mail/mail.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailFlag, MailboxType } from '@prisma';
import { SendMailDto } from '../dto/send-mail.dto';

@Injectable()
export class WebMailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async sendMail(senderEmail: string, dto: SendMailDto) {
    await this.mailService.sendMail({
      to: dto.to,
      subject: dto.subject,
      text: dto.body,
      html: dto.html || dto.body,
    });
    return successResponse(null, 'Mail sent successfully');
  }

  async updateFlags(emailId: string, flags: EmailFlag[]) {
    const result = await this.prisma.client.email.update({
      where: { id: emailId },
      data: { flags },
    });
    return successResponse(result, 'Flags updated successfully');
  }

  async moveToFolder(
    emailId: string,
    userEmail: string,
    folderType: MailboxType,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: userEmail },
      include: { mailboxes: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const targetMailbox = user.mailboxes.find(
      (m: any) => m.type === folderType,
    );
    if (!targetMailbox) {
      throw new NotFoundException(`Mailbox ${folderType} not found`);
    }

    const result = await this.prisma.client.email.update({
      where: { id: emailId },
      data: { mailboxId: targetMailbox.id },
    });
    return successResponse(result, `Email moved to ${folderType}`);
  }

  async deleteEmail(emailId: string, userEmail: string) {
    const email = await this.prisma.client.email.findUnique({
      where: { id: emailId },
      include: { mailbox: true },
    });

    if (!email) throw new NotFoundException('Email not found');

    if (email.mailbox.type === MailboxType.TRASH) {
      const result = await this.prisma.client.email.delete({
        where: { id: emailId },
      });
      return successResponse(result, 'Email permanently deleted');
    } else {
      return this.moveToFolder(emailId, userEmail, MailboxType.TRASH);
    }
  }
}
