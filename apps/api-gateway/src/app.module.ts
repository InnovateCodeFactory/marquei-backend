import { LibsSharedModule } from '@app/shared';
import { AuthGuard } from '@app/shared/guards/auth.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClientModule } from './modules/client/client.module';
import { PlansModule } from './modules/professional/plans/plans.module';
import { ProfessionalModule } from './modules/professional/professional.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SeedModule } from './seed/seed.module';
import { LoggingInterceptor } from './shared/interceptors/loggin.interceptor';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    LibsSharedModule,
    SharedModule,
    ProfessionalModule,
    ClientModule,
    WebhooksModule,
    PlansModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
