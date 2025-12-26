import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FindNearbyBusinessesUseCase } from './find-nearby-businesses.use-case';
import { FindRecommendedBusinessesUseCase } from './find-recommended-businesses.use-case';
import { FindBusinessesByStateUseCase } from './find-businesses-by-state.use-case';
import { resolveStateFromIp } from './geo-ip';
import { GetSectionItemsDto } from '../dto/requests/get-section-items.dto';

@Injectable()
export class GetSectionItemsUseCase {
  constructor(
    private readonly http: HttpService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
    private readonly findRecommendedBusinessesUseCase: FindRecommendedBusinessesUseCase,
    private readonly findBusinessesByStateUseCase: FindBusinessesByStateUseCase,
  ) {}

  async execute(payload: GetSectionItemsDto, req: AppRequest) {
    const page = payload.page ?? 1;
    const limit = payload.limit ?? 20;
    const hasCoords =
      typeof payload.latitude === 'number' &&
      typeof payload.longitude === 'number';
    const empty = {
      items: [],
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasMorePages: false,
    };

    if (payload.section_key === 'recommended') {
      return this.findRecommendedBusinessesUseCase.execute({
        latitude: payload.latitude,
        longitude: payload.longitude,
        limit,
        page,
        ...(payload.radius && { radius: payload.radius }),
        ...(payload.preferred_content && {
          preferred_content: payload.preferred_content,
        }),
      });
    }

    if (payload.section_key === 'nearby') {
      if (!hasCoords) return empty;
      return this.findNearbyBusinessesUseCase.execute({
        latitude: payload.latitude!,
        longitude: payload.longitude!,
        limit,
        page,
        radius: payload.radius ?? 20_000,
        ...(payload.preferred_content && {
          preferred_content: payload.preferred_content,
        }),
      });
    }

    if (payload.section_key === 'state') {
      const ip = getClientIp(req);
      const stateUf = await resolveStateFromIp(this.http, ip);
      if (!stateUf) return empty;
      return this.findBusinessesByStateUseCase.execute({
        uf: stateUf,
        limit,
        page,
        ...(payload.preferred_content && {
          preferred_content: payload.preferred_content,
        }),
      });
    }

    throw new BadRequestException('Seção inválida');
  }
}
