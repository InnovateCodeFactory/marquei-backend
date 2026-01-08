import { AppRequest } from '@app/shared/types/app-request';
import { getClientIp } from '@app/shared/utils';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { GetHomeSectionsDto } from '../dto/requests/get-home-sections.dto';
import { FindBusinessesByStateUseCase } from './find-businesses-by-state.use-case';
import { FindNearbyBusinessesUseCase } from './find-nearby-businesses.use-case';
import { FindRecommendedBusinessesUseCase } from './find-recommended-businesses.use-case';
import { resolveStateInfoFromIp } from './geo-ip';

type Section = {
  key: string;
  title: string;
  items: Array<any>;
  has_more: boolean;
};

@Injectable()
export class GetHomeSectionsUseCase {
  constructor(
    private readonly http: HttpService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
    private readonly findRecommendedBusinessesUseCase: FindRecommendedBusinessesUseCase,
    private readonly findBusinessesByStateUseCase: FindBusinessesByStateUseCase,
  ) {}

  async execute(payload: GetHomeSectionsDto, req: AppRequest) {
    const limit = payload.limit ?? 5;
    const userId = req.user?.id;
    const hasCoords =
      typeof payload.latitude === 'number' &&
      typeof payload.longitude === 'number';
    const nearbyRadius =
      typeof payload.radius === 'number' ? payload.radius : 20_000;

    const ip = getClientIp(req);
    const stateInfo = await resolveStateInfoFromIp(this.http, ip);

    const recommendedPromise = this.findRecommendedBusinessesUseCase.execute({
      latitude: payload.latitude,
      longitude: payload.longitude,
      limit,
      page: 1,
      user_id: userId,
      ...(payload.radius && { radius: payload.radius }),
      ...(payload.preferred_content && {
        preferred_content: payload.preferred_content,
      }),
    });

    const nearbyPromise = hasCoords
      ? this.findNearbyBusinessesUseCase.execute({
          latitude: payload.latitude!,
          longitude: payload.longitude!,
          limit,
          page: 1,
          radius: nearbyRadius,
          user_id: userId,
          ...(payload.preferred_content && {
            preferred_content: payload.preferred_content,
          }),
        })
      : null;

    const statePromise = stateInfo?.uf
      ? this.findBusinessesByStateUseCase.execute({
          uf: stateInfo.uf,
          limit,
          page: 1,
          user_id: userId,
          ...(payload.preferred_content && {
            preferred_content: payload.preferred_content,
          }),
        })
      : null;

    const [recommended, nearby, byState] = await Promise.all([
      recommendedPromise,
      nearbyPromise,
      statePromise,
    ]);

    const sections: Section[] = [];

    if (hasCoords) {
      sections.push({
        key: 'nearby',
        title: 'Próximos a você',
        items: nearby?.items ?? [],
        has_more: nearby?.hasMorePages ?? false,
      });
    }

    sections.push({
      key: 'recommended',
      title: 'Recomendados',
      items: recommended?.items ?? [],
      has_more: recommended?.hasMorePages ?? false,
    });

    if (stateInfo) {
      sections.push({
        key: 'state',
        title: `Em ${stateInfo.name}`,
        items: byState?.items ?? [],
        has_more: byState?.hasMorePages ?? false,
      });
    }

    return { sections };
  }
}
