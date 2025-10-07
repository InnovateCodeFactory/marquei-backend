import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class UploadProfessionalProfilePictureUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(file: Express.Multer.File, user: CurrentUser) {
    const { id: userId, current_selected_business_id } = user;
    if (!current_selected_business_id)
      throw new BadRequestException('Nenhum negócio selecionado');

    const prof = await this.prisma.professionalProfile.findFirst({
      where: { userId, business_id: current_selected_business_id },
      select: { id: true },
    });
    if (!prof) throw new NotFoundException('Perfil profissional não encontrado');

    const ext = (file.mimetype?.split('/')?.[1] ?? 'png').toLowerCase();
    const key = `marquei/professionals/${prof.id}/avatar-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { publicUrl, etag } = await this.fs.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype || 'image/png',
      metadata: { user_id: userId, professional_profile_id: prof.id, source: 'PROFESSIONAL_AVATAR' },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        UploadedMedia: {
          create: { key, etag: etag?.replace(/"/g, ''), source: 'PROFESSIONAL_AVATAR' },
        },
      },
    });

    await this.prisma.professionalProfile.update({
      where: { id: prof.id },
      data: { profile_image: key },
      select: { id: true },
    });

    return { url: publicUrl };
  }
}

