import { PrismaService } from '@app/shared';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateMailTemplateDto } from '../dto/create-mail-template.dto';

@Injectable()
export class CreateMailTemplateUseCase implements OnModuleInit {
  private readonly logger = new Logger(CreateMailTemplateUseCase.name);
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // await this.execute({
    //   description: 'Notificação de novo agendamento para profissional',
    //   subject: 'Novo agendamento!',
    //   pre_header: '',
    //   type: SendMailTypeEnum.NEW_APPOINTMENT_PROFESSIONAL,
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
