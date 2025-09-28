import { Module } from '@nestjs/common';
import { CloseDueAppointmentsUseCase } from './appointments/use-cases';

@Module({
  providers: [
    // Use cases
    CloseDueAppointmentsUseCase,
  ],
  exports: [
    // Use cases
    CloseDueAppointmentsUseCase,
  ],
})
export class ApplicationModule {}
