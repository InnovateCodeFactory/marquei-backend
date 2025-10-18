import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { CreateServiceUseCase, GetServicesUseCase, SoftDeleteServiceUseCase, UpdateServiceUseCase } from './use-cases';
import { DeleteServiceUseCase } from './use-cases/delete-service.use-case';

@Module({
  controllers: [ServicesController],
  providers: [
    ResponseHandlerService,
    CreateServiceUseCase,
    GetServicesUseCase,
    DeleteServiceUseCase,
    UpdateServiceUseCase,
    SoftDeleteServiceUseCase,
  ],
})
export class ServicesModule {}
