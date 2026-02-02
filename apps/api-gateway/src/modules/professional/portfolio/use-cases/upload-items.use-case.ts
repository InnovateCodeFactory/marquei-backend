import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UploadPortfolioItemsDto } from '../dto/requests';

@Injectable()
export class UploadPortfolioItemsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(
    user: CurrentUser,
    files: Express.Multer.File[],
    dto: UploadPortfolioItemsDto,
  ) {
    const portfolioModel = (this.prisma as any)?.businessPortfolioItem;
    if (!portfolioModel?.create) {
      throw new InternalServerErrorException(
        'Prisma client desatualizado para BusinessPortfolioItem. Rode prisma generate e reinicie o backend.',
      );
    }

    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');
    if (!files?.length) throw new BadRequestException('No files provided');

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!business) throw new NotFoundException('Business not found');

    let folderId: string | null = null;
    if (dto.folder_id) {
      const folder = await this.prisma.businessPortfolioFolder.findFirst({
        where: { id: dto.folder_id, businessId },
        select: { id: true },
      });
      if (!folder) throw new NotFoundException('Folder not found');
      folderId = folder.id;
    }

    const uploadedKeys: string[] = [];

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
          const folderSegment = folderId ?? 'root';
          const key = `businesses/${businessId}/portfolio/${folderSegment}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;

          const { publicUrl, etag } = await this.fs.upload({
            key,
            body: file.buffer,
            contentType: file.mimetype || 'image/png',
            metadata: {
              business_id: businessId,
              source: 'BUSINESS_PORTFOLIO',
              folder_id: folderId ?? undefined,
            },
          });

          uploadedKeys.push(key);

          const item = await portfolioModel.create({
            data: {
              business: { connect: { id: businessId } },
              folder: folderId ? { connect: { id: folderId } } : undefined,
              key,
              uploaded_by: { connect: { id: user.id } },
            },
            select: {
              id: true,
              key: true,
              folderId: true,
              created_at: true,
            },
          });

          return {
            id: item.id,
            folder_id: item.folderId,
            created_at: item.created_at,
            key: item.key,
            url: publicUrl,
            etag: etag?.replace(/"/g, ''),
          };
        }),
      );

      return results;
    } catch (error) {
      if (uploadedKeys.length > 0) {
        await Promise.allSettled(
          uploadedKeys.map((key) => this.fs.delete(key)),
        );
      }
      throw error;
    }
  }
}
