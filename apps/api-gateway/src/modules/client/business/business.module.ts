import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  FindNearbyBusinessesUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessByIdUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [
    FindNearbyBusinessesUseCase,
    GetBusinessByIdUseCase,
    GetServicesUseCase,
    GetProfessionalsForAppointmentUseCase,
    GetAvailableTimesForServiceAndProfessionalUseCase,
  ],
})
export class BusinessModule {}
