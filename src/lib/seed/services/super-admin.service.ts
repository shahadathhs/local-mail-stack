import { ENVEnum } from '@/common/enum/env.enum';
import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SuperAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap(): Promise<void> {
    return this.seedSuperAdminUser();
  }

  async seedSuperAdminUser(): Promise<void> {
    const superAdminEmail = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_EMAIL,
    );
    const superAdminPass = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_PASS,
    );

    const superAdminExists = await this.prisma.client.user.findFirst({
      where: {
        email: superAdminEmail,
      },
    });

    // * create super admin
    if (!superAdminExists) {
      const newUser = await this.prisma.client.user.create({
        data: {
          name: 'Super Admin',
          email: superAdminEmail,
          password: await this.authUtils.hash(superAdminPass),
          role: 'SUPER_ADMIN',
          isVerified: true,
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      this.eventEmitter.emit(QueueEventsEnum.MAILBOX_SETUP, {
        userId: newUser.id,
        email: newUser.email,
      });

      this.logger.log(
        `[CREATE] Super Admin user created with email: ${superAdminEmail}`,
      );
      return;
    }

    // * Log & update if super admin already exists
    const updatedUser = await this.prisma.client.user.update({
      where: {
        email: superAdminEmail,
      },
      data: {
        isVerified: true,
        role: 'SUPER_ADMIN',
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    this.eventEmitter.emit(QueueEventsEnum.MAILBOX_SETUP, {
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    this.logger.log(
      `[UPDATE] Super Admin user updated with email: ${superAdminEmail}`,
    );
  }
}
