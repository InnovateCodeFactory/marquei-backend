import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
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
  ],
})
export class BusinessModule {}
