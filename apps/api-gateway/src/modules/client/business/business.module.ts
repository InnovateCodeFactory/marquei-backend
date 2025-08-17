import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetBusinessByIdUseCase,
  GetServicesUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [
    FindNearbyBusinessesUseCase,
    GetBusinessByIdUseCase,
    GetServicesUseCase,
  ],
})
export class BusinessModule {}
