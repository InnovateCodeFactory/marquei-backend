import { PrismaService } from '@app/shared';
import { HashingService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { RegisterProfessionalUserDto } from '../dto/requests/register-professional-user.dto';

@Injectable()
export class RegisterProfessionalUserUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  async execute(registerDto: RegisterProfessionalUserDto) {
    const { name, email, password, business } = registerDto;

    const slug = this.makeSlugFromName(business.name);

    const [existingUser, existingBusiness] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { email },
        select: { id: true },
      }),
      this.prismaService.business.findUnique({
        where: { slug },
        select: { id: true },
      }),
    ]);

    if (existingUser) throw new BadRequestException('Email already in use');
    if (existingBusiness)
      throw new BadRequestException('Business already exists with this name');

    const newBusiness = await this.prismaService.business.create({
      data: {
        slug,
        name: business.name,
        latitude: business.latitude,
        longitude: business.longitude,
        category: 'BARBERSHOP',
        owner: {
          create: {
            email,
            name,
            password: await this.hashingService.hash(password),
            user_type: 'PROFESSIONAL',
          },
        },
      },
      select: {
        id: true,
        owner: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!newBusiness) {
      throw new BadRequestException('Failed to create business');
    }

    await this.prismaService.professionalProfile.create({
      data: {
        business: {
          connect: { id: newBusiness.id },
        },
        user: {
          connect: { id: newBusiness.owner.id },
        },
      },
    });

    return null;
  }

  private makeSlugFromName(name: string): string {
    return name
      .normalize('NFD') // separa letras de acentos
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // troca não alfanumérico por hífen
      .replace(/^-|-$/g, ''); // remove hífen no começo/fim
  }
}
