import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { HashingService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/requests/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {}

  async execute(loginDto: LoginDto) {
    const { password, username } = loginDto;

    const user = await this.prismaService.user.findFirst({
      where: {
        email: username,
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

    return {
      token: await this.jwtService.signAsync(
        {
          id: user.id,
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: '7d',
        },
      ),
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
