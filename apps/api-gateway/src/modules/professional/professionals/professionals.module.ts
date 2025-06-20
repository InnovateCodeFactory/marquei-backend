import { HashingService, ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import {
  CreateProfessionalUseCase,
  GetProfessionalsUseCase,
} from './use-cases';

@Module({
  controllers: [ProfessionalsController],
  providers: [
    ResponseHandlerService,
    HashingService,
    GetProfessionalsUseCase,
    CreateProfessionalUseCase,
  ],
})
export class ProfessionalsModule {}
