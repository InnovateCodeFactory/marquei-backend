import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import {
  ProfessionalAnalyticsUseCase,
  ProfessionalDashboardAnalyticsUseCase,
} from './use-cases';

@Module({
  controllers: [AnalyticsController],
  providers: [ProfessionalAnalyticsUseCase, ProfessionalDashboardAnalyticsUseCase],
})
export class AnalyticsModule {}
