import { PrismaService } from '@app/shared';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { formatCpf, formatPhoneNumber } from '@app/shared/utils';
import { SelectCurrentBusinessDto } from '../dto/requests/select-current-business.dto';
import { FileSystemService } from '@app/shared/services';

@Injectable()
export class SelectCurrentBusinessUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redis: RedisService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(payload: SelectCurrentBusinessDto, user: CurrentUser) {
    const { current_selected_business_slug } = payload;

    const isUserInBusiness = await this.prismaService.business.findFirst({
      where: {
        slug: current_selected_business_slug,
        professionals: {
          some: {
            userId: user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!isUserInBusiness) throw new NotFoundException('Business not found');

    await Promise.all([
      this.prismaService.currentSelectedBusiness.upsert({
        where: {
          userId: user.id,
        },
        create: {
          userId: user.id,
          businessId: isUserInBusiness.id,
        },
        update: {
          businessId: isUserInBusiness.id,
        },
      }),
      this.redis.clearCurrentUserProfessionalFromRequest({
        userId: user.id,
      }),
    ]);

    // Load fresh user + business context to return to client
    const [dbUser, business, professionalProfile] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          document_number: true,
          push_token: true,
        },
      }),
      this.prismaService.business.findUnique({
        where: { id: isUserInBusiness.id },
        select: {
          id: true,
          slug: true,
          ownerId: true,
          name: true,
          coverImage: true,
          logo: true,
        },
      }),
      this.prismaService.professionalProfile.findFirst({
        where: { userId: user.id, business_id: isUserInBusiness.id },
        select: {
          profile_image: true,
          phone: true,
        },
      }),
    ]);

    return {
      user: dbUser && business
        ? {
            is_the_owner: business.ownerId === dbUser.id,
            ...(business.slug && {
              current_selected_business_slug: business.slug,
              current_selected_business_name: business.name,
            }),
            has_push_token: dbUser.push_token !== null,
            current_selected_business_cover_image: this.fs.getPublicUrl({
              key: business.coverImage,
            }),
            current_selected_business_logo: this.fs.getPublicUrl({
              key: business.logo,
            }),
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            document_number: dbUser.document_number
              ? formatCpf(dbUser.document_number)
              : null,
            profile_image: this.fs.getPublicUrl({
              key: professionalProfile?.profile_image || undefined,
            }),
            phone: professionalProfile?.phone
              ? formatPhoneNumber(professionalProfile.phone)
              : null,
          }
        : null,
    };
  }
}
