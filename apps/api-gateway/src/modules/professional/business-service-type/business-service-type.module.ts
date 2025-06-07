import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessServiceTypeController } from './business-service-type.controller';
import { GetServiceTypesUseCase } from './use-cases';

@Module({
  controllers: [BusinessServiceTypeController],
  providers: [ResponseHandlerService, GetServiceTypesUseCase],
})
export class BusinessServiceTypeModule {}
