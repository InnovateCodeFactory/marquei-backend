import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { CreateServiceUseCase, GetServicesUseCase } from './use-cases';
import { DeleteServiceUseCase } from './use-cases/delete-service.use-case';

@Module({
  controllers: [ServicesController],
  providers: [
    ResponseHandlerService,
    CreateServiceUseCase,
    GetServicesUseCase,
    DeleteServiceUseCase,
  ],
})
export class ServicesModule {}
