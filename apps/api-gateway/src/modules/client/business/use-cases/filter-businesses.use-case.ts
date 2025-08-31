import { PrismaService } from '@app/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class FilterBusinessesUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute() {}
}
