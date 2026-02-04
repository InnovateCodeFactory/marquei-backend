import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OptionalAuthGuard } from '@app/shared/guards/optional-auth.guard';
import { BusinessController } from './business.controller';
import {
  FilterBusinessesUseCase,
  FindBusinessesByStateUseCase,
  FindNearbyBusinessesUseCase,
  FindRecommendedBusinessesUseCase,
  GetHomeSectionsUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
  GetBusinessPortfolioUseCase,
  GetBusinessProfessionalsUseCase,
  GetBusinessCategoriesUseCase,
  GetSectionItemsUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  imports: [HttpModule],
  providers: [
    OptionalAuthGuard,
    FindNearbyBusinessesUseCase,
    FindRecommendedBusinessesUseCase,
    FindBusinessesByStateUseCase,
    GetHomeSectionsUseCase,
    GetSectionItemsUseCase,
    GetBusinessBySlugUseCase,
    GetBusinessPortfolioUseCase,
    GetBusinessProfessionalsUseCase,
    GetServicesUseCase,
    GetProfessionalsForAppointmentUseCase,
    GetAvailableTimesForServiceAndProfessionalUseCase,
    GetBusinessCategoriesUseCase,
    FilterBusinessesUseCase,
  ],
})
export class BusinessModule {}
