import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { tz } from '@date-fns/tz';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { GetAvailableTimesForServiceAndProfessionalUseCase } from '../../business/use-cases';
import { JoinWaitlistDto } from '../dto/requests/join-waitlist.dto';
import {
  computeWaitlistPosition,
  waitlistEntrySelect,
} from './waitlist-presenter';

const IN_TZ = tz('America/Sao_Paulo');

@Injectable()
export class JoinWaitlistUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getAvailableTimes: GetAvailableTimesForServiceAndProfessionalUseCase,
  ) {}

  async execute(dto: JoinWaitlistDto, req: AppRequest) {
    const personId = req.user?.personId;
    if (!personId) throw new UnauthorizedException('Usuário não autenticado.');

    const hasService = Boolean(dto.service_id?.trim());
    const hasCombo = Boolean(dto.combo_id?.trim());
    if (hasService === hasCombo) {
      throw new BadRequestException(
        'Informe service_id ou combo_id (apenas um).',
      );
    }

    const today = format(new Date(), 'yyyy-MM-dd', { in: IN_TZ });
    if (dto.date < today) {
      throw new BadRequestException(
        'Não é possível entrar na fila de um dia que já passou.',
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { slug: dto.business_slug, is_active: true },
      select: { id: true, is_waitlist_enabled: true },
    });
    if (!business) throw new NotFoundException('Negócio não encontrado.');
    if (!business.is_waitlist_enabled) {
      throw new BadRequestException(
        'Este estabelecimento não usa lista de espera.',
      );
    }

    const date = new Date(`${dto.date}T00:00:00.000Z`);
    const existing = await this.prisma.waitlistEntry.findUnique({
      where: {
        uq_waitlist_business_person_date: {
          businessId: business.id,
          personId,
          date,
        },
      },
      select: { id: true, status: true },
    });

    if (existing?.status === 'WAITING') {
      throw new BadRequestException(
        'Você já está na lista de espera desse estabelecimento para esse dia.',
      );
    }
    if (existing?.status === 'CONVERTED') {
      throw new BadRequestException('Você já conseguiu uma vaga nesse dia.');
    }

    // Recalcula no servidor: só entra na fila se o dia está mesmo lotado.
    const availability = await this.getAvailableTimes.execute({
      business_slug: dto.business_slug,
      professional_id: dto.professional_id,
      day: dto.date,
      service_id: dto.service_id,
      combo_id: dto.combo_id,
    });
    if (availability.status === 'AVAILABLE') {
      throw new BadRequestException(
        'Ainda há horários disponíveis nesse dia. Escolha um horário para agendar.',
      );
    }
    if (availability.status === 'CLOSED') {
      throw new BadRequestException(
        'O estabelecimento não atende nesse dia, então não há lista de espera.',
      );
    }

    const customer =
      (await this.prisma.businessCustomer.findFirst({
        where: { businessId: business.id, personId },
        select: { id: true, is_blocked: true },
      })) ?? (await this.createBusinessCustomer(business.id, personId));
    if (customer.is_blocked) {
      throw new BadRequestException(
        'Não foi possível entrar na lista de espera.',
      );
    }

    const data = {
      businessCustomerId: customer.id,
      professionalProfileId: dto.professional_id,
      serviceId: hasService ? dto.service_id! : null,
      serviceComboId: hasCombo ? dto.combo_id! : null,
      status: 'WAITING' as const,
      queued_at: new Date(), // reentrar depois de sair reinicia a posição
      converted_appointment_id: null,
    };

    let entryId: string;
    try {
      entryId = await this.prisma.$transaction(async (tx) => {
        const entry = existing
          ? await tx.waitlistEntry.update({
              where: { id: existing.id },
              data,
              select: { id: true },
            })
          : await tx.waitlistEntry.create({
              data: { businessId: business.id, personId, date, ...data },
              select: { id: true },
            });
        await tx.waitlistEvent.create({
          data: {
            waitlistEntryId: entry.id,
            event_type: 'JOINED',
            by_user_id: req.user.id,
          },
        });
        return entry.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Você já está na lista de espera desse estabelecimento para esse dia.',
        );
      }
      throw error;
    }

    const entry = await this.prisma.waitlistEntry.findUniqueOrThrow({
      where: { id: entryId },
      select: waitlistEntrySelect,
    });

    return {
      id: entry.id,
      date: dto.date,
      status: entry.status,
      position: await computeWaitlistPosition(this.prisma, entry),
    };
  }

  private async createBusinessCustomer(businessId: string, personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { phone: true, email: true },
    });
    return this.prisma.businessCustomer.create({
      data: {
        businessId,
        personId,
        email: person?.email || '',
        phone: person?.phone || '',
        verified: true,
      },
      select: { id: true, is_blocked: true },
    });
  }
}
