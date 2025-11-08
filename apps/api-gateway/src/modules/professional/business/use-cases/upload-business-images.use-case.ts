import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class UploadBusinessImagesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(
    user: CurrentUser,
    files: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    const updates: any = {};
    const result: { logo_url?: string; cover_url?: string } = {};

    if (files.logo?.[0]) {
      const file = files.logo[0];
      const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
      const key = `businesses/${businessId}/logo-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { publicUrl, etag } = await this.fs.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype || 'image/png',
        metadata: { business_id: businessId, source: 'BUSINESS_LOGO' },
      });

      await this.prisma.uploadedMedia.create({
        data: {
          key,
          etag: etag?.replace(/"/g, ''),
          source: 'BUSINESS_LOGO',
          uploaded_by: { connect: { id: user.id } },
        },
      });

      updates.logo = key;
      result.logo_url = publicUrl;
    }

    if (files.cover?.[0]) {
      const file = files.cover[0];
      const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
      const key = `businesses/${businessId}/cover-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { publicUrl, etag } = await this.fs.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype || 'image/png',
        metadata: { business_id: businessId, source: 'BUSINESS_COVER' },
      });

      await this.prisma.uploadedMedia.create({
        data: {
          key,
          etag: etag?.replace(/"/g, ''),
          source: 'BUSINESS_COVER',
          uploaded_by: { connect: { id: user.id } },
        },
      });

      updates.coverImage = key;
      result.cover_url = publicUrl;
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.business.update({
        where: { id: businessId },
        data: updates,
      });
    } else {
      throw new BadRequestException('No files provided');
    }

    return result;
  }
}
