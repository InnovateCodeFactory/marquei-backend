import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { CustomerAppointmentsModule } from '../customer-appointments/customer-appointments.module';
import {
  AcceptWaitlistOfferUseCase,
  DeclineWaitlistOfferUseCase,
  GetMyWaitlistUseCase,
  GetWaitlistOfferUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
} from './use-cases';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [BusinessModule, CustomerAppointmentsModule],
  controllers: [WaitlistController],
  providers: [
    ResponseHandlerService,
    JoinWaitlistUseCase,
    LeaveWaitlistUseCase,
    GetMyWaitlistUseCase,
    GetWaitlistOfferUseCase,
    AcceptWaitlistOfferUseCase,
    DeclineWaitlistOfferUseCase,
  ],
})
export class WaitlistModule {}
