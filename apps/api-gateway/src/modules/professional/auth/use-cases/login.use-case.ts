import { PrismaService } from '@app/shared';
import {
  FileSystemService,
  HashingService,
  TokenService,
} from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/requests/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(loginDto: LoginDto) {
    const { password, username } = loginDto;

    const user = await this.prismaService.user.findFirst({
      where: {
        email: username,
        user_type: 'PROFESSIONAL',
      },
      select: {
        id: true,
        password: true,
        first_access: true,
        push_token: true,
        name: true,
        email: true,
        document_number: true,
        CurrentSelectedBusiness: {
          select: {
            business: {
              select: {
                id: true,
                slug: true,
                ownerId: true,
                name: true,
                coverImage: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!user || !(await this.hashingService.compare(password, user?.password)))
      throw new BadRequestException('Credenciais inválidas');

    const professionalProfile =
      await this.prismaService.professionalProfile.findFirst({
        where: {
          userId: user.id,
          business_id: user.CurrentSelectedBusiness?.[0]?.business?.id,
        },
        select: {
          profile_image: true,
          phone: true,
        },
      });

    const { accessToken, refreshToken } =
      await this.tokenService.issueTokenPair({
        id: user.id,
        user_type: 'PROFESSIONAL',
      });

    return {
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        is_the_owner:
          user.CurrentSelectedBusiness?.[0]?.business?.ownerId === user.id,
        ...(user.CurrentSelectedBusiness?.[0]?.business?.slug && {
          current_selected_business_slug:
            user.CurrentSelectedBusiness[0].business.slug,
          current_selected_business_name:
            user.CurrentSelectedBusiness[0].business.name,
        }),
        first_access: user.first_access,
        has_push_token: user?.push_token !== null,
        current_selected_business_cover_image: this.fs.getPublicUrl({
          key: user.CurrentSelectedBusiness?.[0]?.business?.coverImage,
        }),
        current_selected_business_logo: this.fs.getPublicUrl({
          key: user.CurrentSelectedBusiness?.[0]?.business?.logo,
        }),
        id: user.id,
        name: user.name,
        email: user?.email,
        document_number: user?.document_number,
        profile_image: this.fs.getPublicUrl({
          key: professionalProfile?.profile_image,
        }),
        phone: professionalProfile?.phone,
      },
    };
  }
}
