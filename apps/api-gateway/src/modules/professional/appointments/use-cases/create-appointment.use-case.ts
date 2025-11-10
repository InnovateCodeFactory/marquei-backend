import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { TZDate } from '@date-fns/tz';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { CreateAppointmentDto } from '../dto/requests/create-appointment.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';

@Injectable()
export class CreateAppointmentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(payload: CreateAppointmentDto, req: AppRequest) {
    const { user, headers } = req;

    if (!user?.current_selected_business_id) {
      throw new UnauthorizedException('User not authorized');
    }

    const {
      appointment_date, // string ou Date representando horário LOCAL do negócio
      customer_id, // BusinessCustomer.id
      professional_id,
      service_id,
      notes,
    } = payload;

    // 1) Validar pertencimento ao negócio (em paralelo)
    const [service, professional, bc] = await Promise.all([
      this.prisma.service.findFirst({
        where: {
          id: service_id,
          businessId: user.current_selected_business_id,
        },
        select: { id: true, duration: true, name: true, price_in_cents: true },
      }),
      this.prisma.professionalProfile.findFirst({
        where: {
          id: professional_id,
          business_id: user.current_selected_business_id,
        },
        select: { id: true, business_id: true },
      }),
      this.prisma.businessCustomer.findFirst({
        where: {
          id: customer_id,
          businessId: user.current_selected_business_id,
        },
        select: { personId: true },
      }),
    ]);

    if (!service) {
      throw new UnauthorizedException(
        'O serviço não pertence ao negócio selecionado',
      );
    }
    if (!professional) {
      throw new UnauthorizedException(
        'O profissional não pertence ao negócio selecionado',
      );
    }
    if (!bc) {
      throw new BadRequestException(
        'O cliente informado não pertence ao negócio selecionado',
      );
    }

    if (!service.duration || service.duration <= 0) {
      throw new BadRequestException('Duração do serviço inválida.');
    }

    // 2) Interpretar a entrada como horário LOCAL (America/Sao_Paulo)
    const startLocal = this.toTZDateLocal(appointment_date);
    const endLocal = addMinutes(startLocal, service.duration) as TZDate;

    // Para persistir/consultar em UTC, use como Date normal (mesmo instante):
    const startUtc: Date = new Date(startLocal);
    const endUtc: Date = new Date(endLocal);

    // 3) Checar conflito por SOBREPOSIÇÃO no mesmo profissional
    // overlap se: (db.start < new.end) AND (db.end > new.start)
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        professionalProfileId: professional_id,
        start_at_utc: { lt: endUtc },
        end_at_utc: { gt: startUtc },
      },
      select: { id: true },
    });

    if (overlapping) {
      throw new BadRequestException(
        'Já existe um agendamento que conflita com esse horário para este profissional.',
      );
    }

    // 4) Buscar configurações de lembretes do negócio e preparar jobs
    const reminderJobSettings = await this.prisma.businessReminderSettings.findFirst({
      where: { businessId: professional.business_id },
      select: { channels: true, offsets_min_before: true, timezone: true, businessId: true },
    });

    const reminderJobs: { channel: string; due_at_utc: Date; personId: string; businessId: string }[] = [];
    if (reminderJobSettings) {
      const nowUtc = new Date();
      for (const channel of reminderJobSettings.channels) {
        for (const offsetMin of reminderJobSettings.offsets_min_before) {
          const dueAtUtc = new Date(startLocal.getTime() - offsetMin * 60000);
          if (dueAtUtc <= nowUtc) continue;
          reminderJobs.push({
            channel,
            due_at_utc: dueAtUtc,
            personId: bc.personId,
            businessId: reminderJobSettings.businessId,
          } as any);
        }
      }
    }

    // 5) Criar o agendamento no novo formato
    await this.prisma.appointment.create({
      data: {
        status: 'PENDING',
        start_at_utc: startUtc,
        end_at_utc: endUtc,
        duration_minutes: service.duration,
        timezone: BUSINESS_TZ_ID,
        start_offset_minutes: startLocal.getTimezoneOffset(),
        professional: { connect: { id: professional_id } },
        service: { connect: { id: service_id } },
        customerPerson: { connect: { id: bc.personId } },
        notes: notes || null,
        ...(reminderJobs.length > 0 && {
          ReminderJob: {
            createMany: { skipDuplicates: true, data: reminderJobs as any },
          },
        }),
        events: {
          create: {
            event_type: 'CREATED',
            by_professional: true,
            by_user_id: user.id,
            ip: getClientIp(req),
            user_agent: headers['user-agent'],
          },
        },
      },
    });

    // TODO: disparar e-mail/push para o cliente (se aplicável)
    return null;
  }

  /**
   * Converte entrada (Date ou string) para TZDate no fuso do negócio (America/Sao_Paulo),
   * interpretando a string como horário LOCAL (sem Z).
   */
  private toTZDateLocal(input: Date | string): TZDate {
    if (input instanceof Date) {
      return new TZDate(input, BUSINESS_TZ_ID);
    }
    // suporta "yyyy-MM-ddTHH:mm" ou "yyyy-MM-dd HH:mm" (sem Z)
    const iso = input.replace(' ', 'T');
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ]?(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      iso,
    );
    if (!m) {
      const d = new Date(input);
      if (isNaN(d.getTime())) {
        throw new BadRequestException(
          'Formato de data/hora inválido para appointment_date.',
        );
      }
      return new TZDate(d, BUSINESS_TZ_ID);
    }
    const [, y, mo, d, hh, mm, ss] = m.map(Number) as unknown as number[];
    return new TZDate(y, mo - 1, d, hh, mm, ss || 0, BUSINESS_TZ_ID);
  }
}
