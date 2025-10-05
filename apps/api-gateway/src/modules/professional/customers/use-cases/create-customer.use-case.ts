import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateCustomerDto } from '../dto/requests/create-customer.dto';

export function toE164(phone?: string | null) {
  if (!phone) return null;
  // caso 1: já vem com +55
  if (phone.startsWith('+55')) {
    return `+55${phone.slice(2)}`; // garante que não tenha +550...
  }
  // caso 2: começa com 55 mas sem +
  if (phone.startsWith('55')) {
    return `+${phone}`;
  }
  // caso 3: número local → assume Brasil
  return `+55${phone}`;
}

function normalizeInput(dto: CreateCustomerDto) {
  return {
    name: dto.name.trim(),
    email: dto.email ? dto.email.trim().toLowerCase() : null,
    phone: dto.phone ? toE164(dto.phone) : null,
    birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
    notes: dto.notes ?? null,
  };
}

@Injectable()
export class CreateCustomerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: CreateCustomerDto, currentUser: CurrentUser) {
    if (!currentUser?.current_selected_business_slug) {
      throw new BadRequestException('Nenhum negócio selecionado');
    }

    const { current_selected_business_slug } = currentUser;
    const n = normalizeInput(payload);

    // 1) Acha/Cria a Person (prioridade: documento > email > phone)
    const existingByEmail = n.email
      ? await this.prisma.person.findUnique({
          where: { email: n.email },
          select: { id: true },
        })
      : null;

    const existingByPhone =
      !existingByEmail && n.phone
        ? await this.prisma.person.findUnique({
            where: { phone: n.phone },
            select: { id: true },
          })
        : null;

    const personId =
      existingByEmail?.id ||
      existingByPhone?.id ||
      (
        await this.prisma.person.create({
          data: {
            name: n.name,
            email: n.email,
            phone: n.phone,
            birthdate: n.birthdate,
          },
          select: { id: true },
        })
      ).id;

    // 2) Impede duplicidade do vínculo nesse negócio
    const bcExists = await this.prisma.businessCustomer.findFirst({
      where: {
        personId,
        business: { slug: current_selected_business_slug },
      },
      select: { id: true },
    });
    if (bcExists) {
      throw new ConflictException('Cliente já cadastrado neste negócio');
    }

    // 3) Cria o vínculo BusinessCustomer (podendo guardar dados contextuais)
    await this.prisma.businessCustomer.create({
      data: {
        business: { connect: { slug: current_selected_business_slug } },
        person: { connect: { id: personId } },
        // campos contextuais do negócio:
        notes: n.notes || undefined,
        email: payload.email || undefined, // opcional: sombra “como foi cadastrado no negócio”
        phone: payload.phone || undefined, // idem
      },
      select: { id: true },
    });

    return null;
  }
}
