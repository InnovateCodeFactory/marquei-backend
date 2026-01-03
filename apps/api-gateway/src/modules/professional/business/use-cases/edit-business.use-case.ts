import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Prisma } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { EditBusinessDto } from '../dto/requests/edit-business.dto';

@Injectable()
export class EditBusinessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  async execute(user: CurrentUser, dto: EditBusinessDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const data: Prisma.BusinessUpdateInput = {};
    const validations: Array<Promise<void>> = [];

    if ('name' in dto && typeof dto.name === 'string' && dto.name.trim().length) {
      data.name = dto.name.trim();
    }
    if ('description' in dto) data.description = dto.description ?? null;
    if ('phone' in dto) data.phone = dto.phone ?? null;
    if ('email' in dto) data.email = dto.email ?? null;
    if ('website' in dto) {
      data.website = dto.website ?? null;
      if (typeof dto.website === 'string' && dto.website.trim().length) {
        validations.push(this.validateUrl(dto.website, 'website'));
      }
    }
    if ('instagram' in dto) {
      data.instagram = dto.instagram ?? null;
      if (typeof dto.instagram === 'string' && dto.instagram.trim().length) {
        validations.push(this.validateUrl(dto.instagram, 'instagram'));
      }
    }

    if ('zipCode' in dto) data.zipCode = dto.zipCode ?? null;
    if ('street' in dto) data.street = dto.street ?? null;
    if ('neighbourhood' in dto) data.neighbourhood = dto.neighbourhood ?? null;
    if ('number' in dto) data.number = dto.number ?? null;
    if ('complement' in dto) data.complement = dto.complement ?? null;
    if ('city' in dto) data.city = dto.city ?? null;
    if ('uf' in dto) data.uf = dto.uf ?? null;
    if ('opening_hours' in dto) data.opening_hours = (dto as any).opening_hours ?? null;

    if (Object.keys(data).length === 0) return null;

    if (validations.length) {
      await Promise.all(validations);
    }

    const exists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Business not found');

    await this.prisma.business.update({ where: { id: businessId }, data, select: { id: true } });

    return null;
  }

  private async validateUrl(url: string, field: 'website' | 'instagram') {
    const isValid = await this.checkUrl(url);
    if (!isValid) {
      throw new BadRequestException(
        field === 'website' ? 'Site não encontrado' : 'Instagram não encontrado',
      );
    }
  }

  private async checkUrl(url: string) {
    const headStatus = await this.fetchStatus(url, 'HEAD');
    if (headStatus === 405) {
      const getStatus = await this.fetchStatus(url, 'GET');
      return this.isValidStatus(getStatus);
    }
    return this.isValidStatus(headStatus);
  }

  private async fetchStatus(url: string, method: 'HEAD' | 'GET') {
    try {
      const response = await firstValueFrom(
        this.http.request({
          url,
          method,
          maxRedirects: 5,
          timeout: 5000,
          validateStatus: () => true,
        }),
      );
      return response?.status ?? null;
    } catch (error: any) {
      const status = error?.response?.status;
      return typeof status === 'number' ? status : null;
    }
  }

  private isValidStatus(status?: number | null) {
    if (!status) return false;
    if (status >= 200 && status < 400) return true;
    if (status === 401 || status === 403) return true;
    return false;
  }
}
