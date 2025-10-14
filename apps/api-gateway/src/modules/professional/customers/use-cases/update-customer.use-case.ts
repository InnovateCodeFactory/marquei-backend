import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateCustomerDto } from '../dto/requests/update-customer.dto';

function toE164(phone?: string | null) {
  if (!phone) return null;
  if (phone.startsWith('+55')) return `+55${phone.slice(2)}`;
  if (phone.startsWith('55')) return `+${phone}`;
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

    const personData = this.cleanObject({
      name: payload.name?.trim(),
      email: payload.email?.trim().toLowerCase() || null,
      phone: toE164(payload.phone) || null,
      birthdate: payload.birthdate ? new Date(payload.birthdate) : null,
    });

    const bcData = this.cleanObject({
      notes: payload.notes || null,
      email: payload.email || null,
      phone: payload.phone || null,
      is_blocked: payload.isBlocked,
    });

    // Atualiza apenas se tiver campos
    if (Object.keys(personData).length > 0) {
      await this.prisma.person.update({
        where: { id: bc.personId },
        data: personData,
      });
    }

    if (Object.keys(bcData).length > 0) {
      await this.prisma.businessCustomer.update({
        where: { id: payload.id },
        data: bcData,
      });
    }

    return null;
  }
  private cleanObject<T extends Record<string, any>>(obj: T) {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined),
    );
  }
}
