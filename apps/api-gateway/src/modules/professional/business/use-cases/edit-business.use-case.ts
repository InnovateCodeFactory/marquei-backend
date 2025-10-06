import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EditBusinessDto } from '../dto/requests/edit-business.dto';

@Injectable()
export class EditBusinessUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(user: CurrentUser, dto: EditBusinessDto) {
    const businessId = user?.current_selected_business_id;
    if (!businessId) throw new BadRequestException('No business selected');

    const data: Prisma.BusinessUpdateInput = {};

    if ('name' in dto && typeof dto.name === 'string' && dto.name.trim().length) {
      data.name = dto.name.trim();
    }
    if ('description' in dto) data.description = dto.description ?? null;
    if ('phone' in dto) data.phone = dto.phone ?? null;
    if ('email' in dto) data.email = dto.email ?? null;
    if ('website' in dto) data.website = dto.website ?? null;
    if ('instagram' in dto) data.instagram = dto.instagram ?? null;

    if ('zipCode' in dto) data.zipCode = dto.zipCode ?? null;
    if ('street' in dto) data.street = dto.street ?? null;
    if ('neighbourhood' in dto) data.neighbourhood = dto.neighbourhood ?? null;
    if ('number' in dto) data.number = dto.number ?? null;
    if ('complement' in dto) data.complement = dto.complement ?? null;
    if ('city' in dto) data.city = dto.city ?? null;
    if ('uf' in dto) data.uf = dto.uf ?? null;
    if ('opening_hours' in dto) data.opening_hours = (dto as any).opening_hours ?? null;

    if (Object.keys(data).length === 0) return null;

    const exists = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Business not found');

    await this.prisma.business.update({ where: { id: businessId }, data, select: { id: true } });

    return null;
  }
}
