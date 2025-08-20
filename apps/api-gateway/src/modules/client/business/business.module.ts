import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
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
  ],
})
export class BusinessModule {}
