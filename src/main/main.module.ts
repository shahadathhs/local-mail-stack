import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { WebModule } from './web/web.module';

@Module({
  imports: [AuthModule, WebModule],
})
export class MainModule {}
