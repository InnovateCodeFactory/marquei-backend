import { Module } from '@nestjs/common';
import { BusinessRatingController } from './business-rating.controller';
import { RateBusinessUseCase } from './use-cases';

@Module({
  controllers: [BusinessRatingController],
  providers: [RateBusinessUseCase],
})
export class BusinessRatingModule {}
