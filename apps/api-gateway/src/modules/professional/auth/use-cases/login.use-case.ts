import { PrismaService } from '@app/shared';
import { HashingService, TokenService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/requests/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
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
        CurrentSelectedBusiness: {
          select: {
            business: {
              select: {
                slug: true,
                ownerId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user || !(await this.hashingService.compare(password, user?.password)))
      throw new BadRequestException('Credenciais inválidas');

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
      },
    };
  }
}
