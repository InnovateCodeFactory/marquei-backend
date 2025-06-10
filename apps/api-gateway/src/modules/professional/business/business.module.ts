import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetBusinessByProfessionalUseCase,
} from './use-cases';
import { GetBusinessAvailableTimesUseCase } from './use-cases/get-business-available-times.use-case';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';

@Module({
  controllers: [BusinessController],
  providers: [
    ResponseHandlerService,
    FindNearbyBusinessesUseCase,
    GetBusinessByProfessionalUseCase,
    SelectCurrentBusinessUseCase,
    GetBusinessAvailableTimesUseCase,
  ],
})
export class BusinessModule {}
