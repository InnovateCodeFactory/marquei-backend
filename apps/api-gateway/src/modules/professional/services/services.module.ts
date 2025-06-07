import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { CreateServiceUseCase, GetServicesUseCase } from './use-cases';

@Module({
  controllers: [ServicesController],
  providers: [ResponseHandlerService, CreateServiceUseCase, GetServicesUseCase],
})
export class ServicesModule {}
