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
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvSchemaType>,
  ) {}

  async execute(loginDto: LoginDto) {
    const { password, username } = loginDto;

    const account = await this.prisma.authAccount.findFirst({
      where: { email: username },
      select: {
        id: true,
        password_hash: true,
        first_access: true,
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

    if (
      !account ||
      !(await this.hashing.compare(password, account.password_hash))
    ) {
      throw new BadRequestException('Credenciais inválidas');
    }

    const token = await this.jwt.signAsync(
      { id: account.id },
      {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '7d',
      },
    );

    const current = account.CurrentSelectedBusiness?.[0]?.business;

    return {
      token,
      user: {
        is_the_owner: current ? current.ownerId === account.id : false,
        ...(current?.slug && {
          current_selected_business_slug: current.slug,
          current_selected_business_name: current.name,
        }),
        first_access: account.first_access,
      },
    };
  }
}
