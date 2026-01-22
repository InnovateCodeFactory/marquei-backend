import { Module } from '@nestjs/common';
import { BusinessRatingController } from './business-rating.controller';
import {
  DismissRatingPromptUseCase,
  GetRatingPromptUseCase,
  GetReviewSummaryUseCase,
  GetReviewsUseCase,
  RateBusinessUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessRatingController],
  providers: [
    RateBusinessUseCase,
    GetReviewsUseCase,
    GetReviewSummaryUseCase,
    GetRatingPromptUseCase,
    DismissRatingPromptUseCase,
  ],
})
export class BusinessRatingModule {}
