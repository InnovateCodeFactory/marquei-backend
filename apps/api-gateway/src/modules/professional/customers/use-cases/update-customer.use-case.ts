import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hasProhibitedTerm, normalizePhoneNational } from '@app/shared/utils';
import { UpdateCustomerDto } from '../dto/requests/update-customer.dto';

function toNationalPhone(phone?: string | null) {
  if (!phone || !phone.trim()) return null;
  const national = normalizePhoneNational(phone);
  if (!national) throw new BadRequestException('Telefone inválido');
  return national;
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

    if (payload.name && hasProhibitedTerm(payload.name, 'customer')) {
      throw new BadRequestException(
        'Nome do cliente contém termos não permitidos',
      );
    }

    const personData = this.cleanObject({
      ...(payload.name !== undefined && { name: payload.name.trim() }),
      ...(payload.email !== undefined && {
        email: payload.email.trim().toLowerCase() || null,
      }),
      ...(payload.phone !== undefined && {
        phone: toNationalPhone(payload.phone),
      }),
      ...(payload.birthdate !== undefined && {
        birthdate: payload.birthdate ? new Date(payload.birthdate) : null,
      }),
    });

    const bcData = this.cleanObject({
      ...(payload.notes !== undefined && { notes: payload.notes || null }),
      ...(payload.email !== undefined && { email: payload.email || null }),
      ...(payload.phone !== undefined && {
        phone: toNationalPhone(payload.phone),
      }),
      ...(payload.isBlocked !== undefined && { is_blocked: payload.isBlocked }),
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
