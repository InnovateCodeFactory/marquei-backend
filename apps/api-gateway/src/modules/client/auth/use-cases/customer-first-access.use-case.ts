import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';
import { GuestOrigin } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CustomerFirstAccessDto } from '../dto/requests/customer-first-access.dto';

@Injectable()
export class CustomerFirstAccessUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: CustomerFirstAccessDto) {
    const { device_info, origin } = payload;

    const device_token = randomUUID();

    await this.prismaService.guest.create({
      data: {
        device_info,
        device_token,
        origin: origin ?? GuestOrigin.APP,
      },
    });

    return { device_token };
  }
}
