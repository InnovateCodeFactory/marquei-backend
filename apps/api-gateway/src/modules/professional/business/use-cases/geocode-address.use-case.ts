import { EnvSchemaType } from '@app/shared/environment';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type Input = {
  street?: string;
  number?: string;
  city?: string;
  uf?: string;
  zipCode?: string;
};

@Injectable()
export class GeocodeAddressUseCase {
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService<EnvSchemaType>,
  ) {
    this.token = this.config.getOrThrow('MAPBOX_ACCESS_TOKEN');
  }

  async execute({ street, number, city, uf, zipCode }: Input) {
    const _city = city?.trim() || 'Brasília';
    const _uf = uf?.trim() || 'DF';
    const parts = [street, number, _city && `${_city} - ${_uf}`, zipCode, 'Brasil']
      .filter(Boolean)
      .join(', ');

    if (!parts.length) {
      throw new BadRequestException('Endereço insuficiente para geocodificação');
    }

    const query = encodeURIComponent(parts);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${this.token}`;

    const { data } = await firstValueFrom(this.http.get(url));

    if (!data?.features?.length) {
      throw new BadRequestException('Localização não encontrada');
    }

    const [longitude, latitude] = data.features[0].center as [number, number];

    return { latitude, longitude };
  }
}

