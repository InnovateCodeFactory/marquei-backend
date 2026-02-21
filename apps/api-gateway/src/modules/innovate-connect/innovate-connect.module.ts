import { Module } from '@nestjs/common';
import { InnovateConnectController } from './innovate-connect.controller';
import { InnovateConnectAdminBootstrap } from './innovate-connect-admin.bootstrap';
import { InnovateConnectAuthGuard } from './guards/innovate-connect-auth.guard';
import {
  InnovateConnectCatalogUseCase,
  InnovateConnectListAppointmentsUseCase,
  InnovateConnectListBusinessesUseCase,
  InnovateConnectListAppUpdatesUseCase,
  InnovateConnectListLogsUseCase,
  InnovateConnectListServicesUseCase,
  InnovateConnectListSubscriptionsUseCase,
  InnovateConnectListUsersUseCase,
  InnovateConnectLoginUseCase,
  InnovateConnectCreateAppUpdateModalUseCase,
  InnovateConnectToggleAppUpdateModalUseCase,
} from './use-cases';

@Module({
  controllers: [InnovateConnectController],
  providers: [
    InnovateConnectAdminBootstrap,
    InnovateConnectAuthGuard,
    InnovateConnectLoginUseCase,
    InnovateConnectCatalogUseCase,
    InnovateConnectListUsersUseCase,
    InnovateConnectListBusinessesUseCase,
    InnovateConnectListAppUpdatesUseCase,
    InnovateConnectListAppointmentsUseCase,
    InnovateConnectListServicesUseCase,
    InnovateConnectListLogsUseCase,
    InnovateConnectListSubscriptionsUseCase,
    InnovateConnectCreateAppUpdateModalUseCase,
    InnovateConnectToggleAppUpdateModalUseCase,
  ],
})
export class InnovateConnectModule {}
