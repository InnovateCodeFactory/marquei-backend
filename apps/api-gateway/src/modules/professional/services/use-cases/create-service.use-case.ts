import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateServiceDto } from '../dto/requests/create-service.dto';

@Injectable()
export class CreateServiceUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: CreateServiceDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;
    const { duration, name, price_in_cents } = payload;

    const serviceExists = await this.prismaService.service.findFirst({
      where: {
        name,
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (serviceExists)
      throw new ConflictException('Serviço já cadastrado com este nome');

    await this.prismaService.service.create({
      data: {
        name,
        duration,
        price_in_cents,
        business: {
          connect: {
            slug: current_selected_business_slug,
          },
        },
      },
    });

    return null;
  }
}
