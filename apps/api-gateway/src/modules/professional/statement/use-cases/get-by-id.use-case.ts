import { PrismaService } from '@app/shared';
import { FileSystemService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { formatPhoneNumber } from '@app/shared/utils';
import { Price } from '@app/shared/value-objects';
import { Injectable, NotFoundException } from '@nestjs/common';
import { format } from 'date-fns';
import { GetProfessionalStatementByIdDto } from '../dto/requests/get-by-id.dto';

@Injectable()
export class GetProfessionalStatementByIdUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fs: FileSystemService,
  ) {}

  async execute(dto: GetProfessionalStatementByIdDto, req: AppRequest) {
    const statement = await this.prismaService.professionalStatement.findUnique(
      {
        where: { id: dto.id },
        select: {
          id: true,
          description: true,
          value_in_cents: true,
          type: true,
          created_at: true,
          professional_profile: {
            select: {
              profile_image: true,
              phone: true,
              User: {
                select: {
                  name: true,
                },
              },
            },
          },
          appointment: {
            select: {
              id: true,
              notes: true,
              start_at_utc: true,
              end_at_utc: true,
              customerPerson: {
                select: {
                  id: true,
                  profile_image: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    );

    if (!statement) throw new NotFoundException('Extrato não encontrado');

    return {
      id: statement.id,
      description: statement.description,
      value: new Price(statement.value_in_cents).toCurrency(),
      type: statement.type,
      created_at: format(statement.created_at, 'dd/MM/yyyy HH:mm'),
      professional: {
        name: statement.professional_profile.User.name,
        phone: formatPhoneNumber(statement.professional_profile.phone),
        profile_image: this.fs.getPublicUrl({
          key: statement.professional_profile.profile_image,
        }),
      },
      appointment: statement.appointment
        ? {
            id: statement.appointment.id,
            notes: statement.appointment.notes,
            start_at: format(
              statement.appointment.start_at_utc,
              'dd/MM/yyyy HH:mm',
            ),
            end_at: format(
              statement.appointment.end_at_utc,
              'dd/MM/yyyy HH:mm',
            ),
            customer: {
              id: statement.appointment.customerPerson.id,
              name: statement.appointment.customerPerson.name,
              profile_image: this.fs.getPublicUrl({
                key: statement.appointment.customerPerson.profile_image,
              }),
              phone: formatPhoneNumber(
                statement.appointment.customerPerson.phone,
              ),
              email: statement.appointment.customerPerson.email,
            },
            service: {
              name: statement.appointment.service.name,
            },
          }
        : null,
    };
  }
}
