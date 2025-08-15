import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetBusinessByIdUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [FindNearbyBusinessesUseCase, GetBusinessByIdUseCase],
})
export class BusinessModule {}
