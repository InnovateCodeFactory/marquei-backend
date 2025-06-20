import { ResponseHandlerService } from '@app/shared/services';
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
    GetProfessionalsUseCase,
    CreateProfessionalUseCase,
  ],
})
export class ProfessionalsModule {}
