import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { FindNearbyBusinessesUseCase } from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [FindNearbyBusinessesUseCase],
})
export class BusinessModule {}
