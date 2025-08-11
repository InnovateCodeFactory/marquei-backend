import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate } from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    // id é do BusinessContact
    const contact = await this.prisma.businessContact.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        phone: true,
        verified: true,
        created_at: true,
        customerId: true, // para contar appointments
      },
    });

    if (!contact) throw new NotFoundException('Cliente não encontrado');

    // conta appointments do perfil global (se houver) no negócio atual
    const appointmentsCount = contact.customerId
      ? await this.prisma.appointment.count({
          where: {
            customerProfileId: contact.customerId,
            professional: {
              business_id: user.current_selected_business_id,
            },
          },
        })
      : 0;

    return {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      verified: contact.verified,
      appointments_count: String(appointmentsCount),
      created_at: formatDate(contact.created_at, "dd 'de' MMM'.' 'de' yyyy"),
    };
  }
}
