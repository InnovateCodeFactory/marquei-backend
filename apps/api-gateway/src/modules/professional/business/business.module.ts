import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { FindNearbyBusinessesUseCase } from './use-cases';

@Module({
  controllers: [BusinessController],
  providers: [ResponseHandlerService, FindNearbyBusinessesUseCase],
})
export class BusinessModule {}
