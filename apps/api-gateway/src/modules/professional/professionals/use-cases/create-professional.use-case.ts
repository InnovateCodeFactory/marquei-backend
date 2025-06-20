import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreateProfessionalUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(payload: any, user: CurrentUser) {}
}
