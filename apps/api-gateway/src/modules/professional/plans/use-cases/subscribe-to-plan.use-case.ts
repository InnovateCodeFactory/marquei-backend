import { PrismaService } from '@app/shared';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { CurrentUser } from '@app/shared/types/app-request';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SubscribeToPlanDto } from '../dto/requests/subscribe-to-plan.dto';

@Injectable()
export class SubscribeToPlanUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(payload: SubscribeToPlanDto, currentUser: CurrentUser) {
    throw new InternalServerErrorException(
      'Use case desativado temporariamente',
    );
  }
}
