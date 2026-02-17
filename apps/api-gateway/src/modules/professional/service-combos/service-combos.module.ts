import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ServiceCombosController } from './service-combos.controller';
import {
  CreateServiceComboUseCase,
  DeleteServiceComboUseCase,
  GetServiceComboByIdUseCase,
  GetServiceCombosUseCase,
  ToggleServiceComboVisibilityUseCase,
  UpdateServiceComboUseCase,
} from './use-cases';

@Module({
  controllers: [ServiceCombosController],
  providers: [
    ResponseHandlerService,
    CreateServiceComboUseCase,
    GetServiceCombosUseCase,
    GetServiceComboByIdUseCase,
    UpdateServiceComboUseCase,
    ToggleServiceComboVisibilityUseCase,
    DeleteServiceComboUseCase,
  ],
})
export class ServiceCombosModule {}
