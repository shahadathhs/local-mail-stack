import { Module } from '@nestjs/common';
import { WebMailService } from './services/web-mail.service';
import { WebService } from './services/web.service';
import { WebController } from './web.controller';

@Module({
  controllers: [WebController],
  providers: [WebService, WebMailService],
})
export class WebModule {}
