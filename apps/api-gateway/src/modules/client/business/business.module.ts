import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FilterBusinessesUseCase,
  FindNearbyBusinessesUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
  GetBusinessCategoriesUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [
    FindNearbyBusinessesUseCase,
    GetBusinessBySlugUseCase,
    GetServicesUseCase,
    GetProfessionalsForAppointmentUseCase,
    GetAvailableTimesForServiceAndProfessionalUseCase,
    GetBusinessCategoriesUseCase,
    FilterBusinessesUseCase,
  ],
})
export class BusinessModule {}
