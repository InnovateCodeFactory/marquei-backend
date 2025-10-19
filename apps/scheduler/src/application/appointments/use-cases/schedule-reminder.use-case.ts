import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ScheduleReminderUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  @Cron('0,30 * * * *', {
    timeZone: 'America/Sao_Paulo',
  })
  async execute() {}
}
