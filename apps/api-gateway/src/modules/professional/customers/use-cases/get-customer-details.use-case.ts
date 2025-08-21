import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate } from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    // id é BusinessCustomer.id
    const bc = await this.prisma.businessCustomer.findUnique({
      where: { id },
      select: {
        created_at: true,
        verified: true,
        person: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        business: { select: { id: true } },
      },
    });

    if (!bc) throw new NotFoundException('Cliente não encontrado');

    const appointmentsCount = await this.prisma.appointment.count({
      where: {
        personId: bc.person.id,
        professional: { business_id: user.current_selected_business_id },
      },
    });

    return {
      name: bc.person.name,
      email: bc.person.email,
      phone: bc.person.phone,
      verified: bc.verified,
      appointments_count: String(appointmentsCount),
      created_at: formatDate(bc.created_at, "dd 'de' MMM'.' 'de' yyyy"),
    };
  }
}
