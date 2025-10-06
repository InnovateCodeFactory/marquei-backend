import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { formatDate } from '@app/shared/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetCustomerDetailsDto } from '../dto/requests/get-customer-details.dto';

@Injectable()
export class GetCustomerDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileSystem: FileSystemService,
  ) {}

  async execute({ id }: GetCustomerDetailsDto, user: CurrentUser) {
    // id é BusinessCustomer.id
    const bc = await this.prisma.businessCustomer.findUnique({
      where: { id },
      select: {
        created_at: true,
        verified: true,
        notes: true,

        person: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_image: true,
            birthdate: true,
          },
        },
        business: { select: { id: true } },
      },
    });

    if (!bc) throw new NotFoundException('Cliente não encontrado');

    const [totalAppointments, pendingAppointments, canceledAppointments] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            personId: bc.person.id,
            professional: { business_id: user.current_selected_business_id },
          },
        }),
        this.prisma.appointment.count({
          where: {
            personId: bc.person.id,
            professional: { business_id: user.current_selected_business_id },
            status: 'PENDING',
          },
        }),
        this.prisma.appointment.count({
          where: {
            personId: bc.person.id,
            professional: { business_id: user.current_selected_business_id },
            status: 'CANCELED',
          },
        }),
      ]);

    return {
      name: bc.person.name,
      email: bc.person.email,
      phone: bc.person.phone,
      birthdate: bc.person?.birthdate
        ? bc.person.birthdate
            .toISOString()
            .split('T')[0]
            .split('-')
            .reverse()
            .join('/')
        : null,
      notes: bc.notes,
      verified: bc.verified,

      total_appointments_count: String(totalAppointments),
      pending_appointments_count: String(pendingAppointments),
      canceled_appointments_count: String(canceledAppointments),
      id: id,
      created_at: formatDate(bc.created_at, "dd 'de' MMM'.' 'de' yyyy"),
      profile_image: this.fileSystem.getPublicUrl({
        key: bc.person.profile_image,
      }),
    };
  }
}
