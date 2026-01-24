import { CurrentUser } from '@app/shared/types/app-request';
import { parseYmdToTZDate } from '@app/shared/utils';
import { TZDate, tz } from '@date-fns/tz';
import { Injectable } from '@nestjs/common';
import { addDays, format } from 'date-fns';
import { GetAvailableTimesForServiceAndProfessionalUseCase } from '../../../client/business/use-cases/get-available-times-for-service-and-professional.use-case';
import { GetAvailableTimesDto } from '../dto/requests/get-available-times.dto';

const BUSINESS_TZ_ID = 'America/Sao_Paulo';
const IN_TZ = tz(BUSINESS_TZ_ID);

@Injectable()
export class GetAvailableTimesUseCase {
  constructor(
    private readonly getAvailableTimesForServiceAndProfessionalUseCase: GetAvailableTimesForServiceAndProfessionalUseCase,
  ) {}

  async execute(payload: GetAvailableTimesDto, user: CurrentUser) {
    const { service_id, start_date, professional_profile_id } = payload;
    const { current_selected_business_slug } = user;
    const businessSlug = current_selected_business_slug ?? '';

    const startLocalDay0 = parseYmdToTZDate({
      ymd: start_date,
      tzId: BUSINESS_TZ_ID,
    });

    const days: { date: string; availableSlots: string[] }[] = [];

    for (let i = 0; i < 3; i++) {
      const currentDateLocal =
        i === 0 ? startLocalDay0 : (addDays(startLocalDay0, i) as TZDate);
      const dateStr = format(currentDateLocal, 'yyyy-MM-dd', { in: IN_TZ });

      const result =
        await this.getAvailableTimesForServiceAndProfessionalUseCase.execute({
          service_id,
          professional_id: professional_profile_id,
          day: dateStr,
          business_slug: businessSlug,
        });

      days.push({
        date: result.date,
        availableSlots: result.availableSlots,
      });
    }

    return { days };
  }
}
