import { successResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { FileService } from '@/lib/file/services/file.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { FileInstance } from '@prisma';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class AuthUpdateProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly fileService: FileService,
  ) {}

  @HandleError('Failed to update profile', 'User')
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // * if image is provided, upload to S3 and update user
    let fileInstance: FileInstance | undefined;
    if (file) {
      const uploadFile = await this.fileService.processUploadedFile(file);

      if (uploadFile) {
        fileInstance = uploadFile;
      }
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim() ? dto.name.trim() : user.name,
        ...(fileInstance && {
          profilePicture: {
            connect: fileInstance,
          },
        }),
      },
      include: { profilePicture: true },
    });

    return successResponse(
      await this.authUtils.sanitizeUser(updatedUser),
      'Profile updated successfully',
    );
  }
}
