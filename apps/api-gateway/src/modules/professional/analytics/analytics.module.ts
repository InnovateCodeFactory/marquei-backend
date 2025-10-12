import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { ProfessionalAnalyticsUseCase } from './use-cases';

@Module({
  controllers: [AnalyticsController],
  providers: [ProfessionalAnalyticsUseCase],
})
export class AnalyticsModule {}
