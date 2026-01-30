import { Module } from '@nestjs/common';
import { InnovateConnectController } from './innovate-connect.controller';
import { InnovateConnectAdminBootstrap } from './innovate-connect-admin.bootstrap';
import { InnovateConnectAuthGuard } from './guards/innovate-connect-auth.guard';
import {
  InnovateConnectCatalogUseCase,
  InnovateConnectListAppointmentsUseCase,
  InnovateConnectListBusinessesUseCase,
  InnovateConnectListLogsUseCase,
  InnovateConnectListServicesUseCase,
  InnovateConnectListSubscriptionsUseCase,
  InnovateConnectListUsersUseCase,
  InnovateConnectLoginUseCase,
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
    InnovateConnectListAppointmentsUseCase,
    InnovateConnectListServicesUseCase,
    InnovateConnectListLogsUseCase,
    InnovateConnectListSubscriptionsUseCase,
  ],
})
export class InnovateConnectModule {}
