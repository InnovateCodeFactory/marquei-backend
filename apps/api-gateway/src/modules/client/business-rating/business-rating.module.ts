import { Module } from '@nestjs/common';
import { BusinessRatingController } from './business-rating.controller';
import {
  GetReviewSummaryUseCase,
  GetReviewsUseCase,
  RateBusinessUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessRatingController],
  providers: [RateBusinessUseCase, GetReviewsUseCase, GetReviewSummaryUseCase],
})
export class BusinessRatingModule {}
