import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateCustomerDto } from '../dto/requests/create-customer.dto';

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: CreateCustomerDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug)
      throw new BadRequestException('Nenhum negócio selecionado');

    const { current_selected_business_slug } = currentUser;

    const customerExists = await this.prismaService.customer.findFirst({
      where: {
        phone: payload.phone,
        business: {
          slug: current_selected_business_slug,
        },
      },
      select: {
        id: true,
      },
    });

    if (customerExists)
      throw new ConflictException('Cliente já cadastrado com este telefone');

    await this.prismaService.customer.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        ...(payload.email && { email: payload.email }),
        business: {
          connect: {
            slug: current_selected_business_slug,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return null;
  }
}
