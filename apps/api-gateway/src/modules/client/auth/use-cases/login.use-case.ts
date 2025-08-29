import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { FileSystemService, HashingService, TokenService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CustomerLoginDto } from '../dto/requests/customer-login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvSchemaType>,
    private readonly fileSystem: FileSystemService,
    private readonly tokenService: TokenService,
  ) {}

  async execute(body: CustomerLoginDto) {
    const { password, username } = body;

    const user = await this.prismaService.user.findFirst({
      where: {
        email: username,
        user_type: 'CUSTOMER',
      },
      select: {
        name: true,
        personId: true,
        password: true,
        id: true,
        push_token: true,
        person: {
          select: {
            phone: true,
            profile_image: true,
          },
        },
      },
    });

    if (!user || !(await this.hashingService.compare(password, user?.password)))
      throw new BadRequestException('Credenciais inválidas');

    let profile_image = null;
    if (user.person.profile_image) {
      profile_image = this.fileSystem.getPublicUrl({
        key: user.person.profile_image,
      });
    }

    const { accessToken, refreshToken } = await this.tokenService.issueTokenPair({
      id: user.id,
      user_type: 'CUSTOMER',
    });

    return {
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        name: user.name,
        phone: user.person.phone,
        personId: user.personId,
        id: user.id,
        has_push_token: !!user.push_token,
        profile_image,
      },
    };
  }
}
