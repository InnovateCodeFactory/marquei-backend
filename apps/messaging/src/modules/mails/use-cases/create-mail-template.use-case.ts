import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateMailTemplateDto } from '../dto/create-mail-template.dto';

@Injectable()
export class CreateMailTemplateUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateMailTemplateUseCase.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // await this.execute({
    //   description: 'Notificação de agendamento cancelado para o cliente',
    //   subject: 'Agendamento Cancelado',
    //   pre_header: 'Seu agendamento foi cancelado',
    //   type: SendMailTypeEnum.APPOINTMENT_CANCELLATION_CUSTOMER,
    //   from: MailsOptionsFromEnum.MARQUEI_GENERAL,
    //   html: ` `,
    // });
  }

  async execute(body: CreateMailTemplateDto) {
    try {
      const template = await this.prisma.mailTemplate.create({
        data: body,
      });

      if (!template) throw new Error('Erro ao criar template de email');

      this.logger.debug(`Template de email criado: ${template.id}`);
      return;
    } catch (error) {
      console.log(error);
    }
  }
}
