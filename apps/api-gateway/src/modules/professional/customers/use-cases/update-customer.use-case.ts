import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateCustomerDto } from '../dto/requests/update-customer.dto';

function toE164(phone?: string | null) {
  if (!phone) return null;
  if (phone.startsWith('+55')) {
    return `+55${phone.slice(2)}`;
  }
  if (phone.startsWith('55')) {
    return `+${phone}`;
  }
  return `+55${phone}`;
}

@Injectable()
export class UpdateCustomerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: UpdateCustomerDto, currentUser: CurrentUser) {
    const bc = await this.prisma.businessCustomer.findFirst({
      where: {
        id: payload.id,
        business: { slug: currentUser.current_selected_business_slug },
      },
      select: { id: true, personId: true },
    });

    if (!bc) throw new NotFoundException('Cliente não encontrado');

    const personData: any = {};
    if (payload.name !== undefined) personData.name = payload.name?.trim();
    if (payload.email !== undefined)
      personData.email = payload.email?.trim().toLowerCase() || null;
    if (payload.phone !== undefined)
      personData.phone = toE164(payload.phone) || null;
    if (payload.birthdate !== undefined)
      personData.birthdate = payload.birthdate
        ? new Date(payload.birthdate)
        : null;

    if (Object.keys(personData).length) {
      await this.prisma.person.update({
        where: { id: bc.personId },
        data: personData,
      });
    }

    const bcData: any = {};
    if (payload.notes !== undefined) bcData.notes = payload.notes || null;
    if (payload.email !== undefined) bcData.email = payload.email || null;
    if (payload.phone !== undefined) bcData.phone = payload.phone || null;

    if (Object.keys(bcData).length) {
      await this.prisma.businessCustomer.update({
        where: { id: payload.id },
        data: bcData,
      });
    }

    return null;
  }
}
