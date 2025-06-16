import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetBusinessByProfessionalUseCase,
  GetCurrentSubscriptionUseCase,
  GetProfessionalsUseCase,
} from './use-cases';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';

@Module({
  controllers: [BusinessController],
  providers: [
    ResponseHandlerService,
    FindNearbyBusinessesUseCase,
    GetBusinessByProfessionalUseCase,
    SelectCurrentBusinessUseCase,
    GetCurrentSubscriptionUseCase,
    GetProfessionalsUseCase,
  ],
})
export class BusinessModule {}
