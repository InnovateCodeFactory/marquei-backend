import { EnvSchemaType } from '@app/shared/environment';
import { MailTemplateDataMap } from '@app/shared/types/mail-template-data-map.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailOptions } from './types/request/send-mail.type';
import { SendMailResponse } from './types/response/send-mail-response.type';

@Injectable()
export class MailBaseService {
  private readonly logger = new Logger(MailBaseService.name);

  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService<EnvSchemaType>) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow('MAIL_HOST'),
      port: this.configService.getOrThrow('MAIL_PORT'),
      secure: true,
      auth: {
        user: this.configService.getOrThrow('MAIL_USER'),
        pass: this.configService.getOrThrow('MAIL_PASS'),
      },
    });
  }

  async sendMail({
    to,
    subject,
    html,
    from,
  }: SendMailOptions): Promise<SendMailResponse> {
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });

      return info;
    } catch (error) {
      throw error;
    }
  }

  fillTemplate<T extends keyof MailTemplateDataMap>({
    data,
    template,
    type,
  }: {
    type: T;
    template: string;
    data: MailTemplateDataMap[T];
  }): string {
    return Object.entries(data).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }, template);
  }
}
