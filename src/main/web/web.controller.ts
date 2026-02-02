import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Render,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailFlag, MailboxType } from '@prisma';
import { SendMailDto } from './dto/send-mail.dto';
import { WebMailService } from './services/web-mail.service';
import { WebService } from './services/web.service';

@ApiTags('Dev Mailbox')
@Controller('dev')
export class WebController {
  constructor(
    private readonly webService: WebService,
    private readonly webMailService: WebMailService,
    private readonly utils: AuthUtilsService,
  ) {}

  private verifySignature(email: string, sig: string) {
    if (!this.utils.verifyMailboxUrlSignature(email, sig)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  @ApiOperation({ summary: 'View Dev Mailbox' })
  @Get('mailbox/:email')
  @Render('mailbox')
  async getMailbox(
    @Param('email') email: string,
    @Query('sig') sig: string,
    @Query('folder') folder: string = 'INBOX',
    @Query('q') q?: string,
  ) {
    return this.webService.getMailboxData(email, sig, folder, q);
  }

  @ApiOperation({ summary: 'Send Mail from Dev UI' })
  @Post('mail/send')
  async sendMail(
    @Query('email') email: string,
    @Query('sig') sig: string,
    @Body() dto: SendMailDto,
  ) {
    this.verifySignature(email, sig);
    return this.webMailService.sendMail(email, dto);
  }

  @ApiOperation({ summary: 'Mark mail as Read' })
  @Patch('mail/:id/read')
  async markAsRead(
    @Param('id') id: string,
    @Query('email') email: string,
    @Query('sig') sig: string,
  ) {
    this.verifySignature(email, sig);
    return this.webMailService.updateFlags(id, [EmailFlag.SEEN]);
  }

  @ApiOperation({ summary: 'Mark mail as Unread' })
  @Patch('mail/:id/unread')
  async markAsUnread(
    @Param('id') id: string,
    @Query('email') email: string,
    @Query('sig') sig: string,
  ) {
    this.verifySignature(email, sig);
    return this.webMailService.updateFlags(id, []);
  }

  @ApiOperation({ summary: 'Archive mail' })
  @Patch('mail/:id/archive')
  async archive(
    @Param('id') id: string,
    @Query('email') email: string,
    @Query('sig') sig: string,
  ) {
    this.verifySignature(email, sig);
    return this.webMailService.moveToFolder(id, email, MailboxType.ARCHIVE);
  }

  @ApiOperation({ summary: 'Delete mail' })
  @Delete('mail/:id')
  async delete(
    @Param('id') id: string,
    @Query('email') email: string,
    @Query('sig') sig: string,
  ) {
    this.verifySignature(email, sig);
    return this.webMailService.deleteEmail(id, email);
  }
}
