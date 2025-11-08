import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { removeSpecialCharacters } from '@app/shared/utils';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadProfilePictureUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute(file: Express.Multer.File, user: CurrentUser) {
    const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
    const key = `avatars/${user?.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { publicUrl, etag } = await this.fileSystem.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype || 'image/png',
      metadata: { user_id: user?.id, user_type: 'CUSTOMER' },
    });

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        UploadedMedia: {
          create: {
            key,
            etag: removeSpecialCharacters(etag),
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
