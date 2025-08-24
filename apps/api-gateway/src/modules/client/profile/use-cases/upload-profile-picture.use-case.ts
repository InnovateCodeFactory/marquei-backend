import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentCustomer } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadProfilePictureUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(file: Express.Multer.File, user: CurrentCustomer) {
    const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
    const key = `avatars/${user?.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { publicUrl, etag } = await this.fileSystem.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype || 'image/png',
      metadata: { userId: user?.id },
    });

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        UploadedMedia: {
          create: {
            key,
            etag,
            source: 'CUSTOMER_AVATAR',
          },
        },
        person: {
          update: {
            profile_image: key,
          },
        },
      },
    });

    return { url: publicUrl };
  }
}
