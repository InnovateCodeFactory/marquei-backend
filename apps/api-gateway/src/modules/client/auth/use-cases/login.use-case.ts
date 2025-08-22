import { PrismaService } from '@app/shared';
import { EnvSchemaType } from '@app/shared/environment';
import { HashingService } from '@app/shared/services';
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
          user_type: 'CUSTOMER',
        },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: '30d',
        },
      ),
      user: {
        name: user.name,
        phone: user.person.phone,
        personId: user.personId,
        id: user.id,
        has_push_token: !!user.push_token,
      },
    };
  }
}
