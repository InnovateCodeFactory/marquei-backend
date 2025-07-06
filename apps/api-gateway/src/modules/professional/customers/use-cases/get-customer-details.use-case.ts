import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate } from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerDetailsUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    const customer = await this.prismaService.customer.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        phone: true,
        verified: true,
        created_at: true,
        _count: {
          select: {
            Appointment: {
              where: {
                professional: {
                  business_id: user.current_selected_business_id,
                },
              },
            },
          },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const obj = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      verified: customer.verified,
      appointments_count: customer._count.Appointment.toString(),
      created_at: formatDate(customer.created_at, "dd 'de' MMM'.' 'de' yyyy"),
    };

    return obj;
  }
}
