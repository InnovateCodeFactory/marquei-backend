import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BusinessController } from './business.controller';
import {
  FilterBusinessesUseCase,
  FindBusinessesByStateUseCase,
  FindNearbyBusinessesUseCase,
  FindRecommendedBusinessesUseCase,
  GetHomeSectionsUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
  GetBusinessCategoriesUseCase,
  GetSectionItemsUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  imports: [HttpModule],
  providers: [
    FindNearbyBusinessesUseCase,
    FindRecommendedBusinessesUseCase,
    FindBusinessesByStateUseCase,
    GetHomeSectionsUseCase,
    GetSectionItemsUseCase,
    GetBusinessBySlugUseCase,
    GetServicesUseCase,
    GetProfessionalsForAppointmentUseCase,
    GetAvailableTimesForServiceAndProfessionalUseCase,
    GetBusinessCategoriesUseCase,
    FilterBusinessesUseCase,
  ],
})
export class BusinessModule {}
