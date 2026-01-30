import { LibsSharedModule } from '@app/shared';
import { AuthGuard } from '@app/shared/guards/auth.guard';
import { getClientIp } from '@app/shared/utils';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientModule } from './modules/client/client.module';
import { InnovateConnectModule } from './modules/innovate-connect/innovate-connect.module';
import { PlansModule } from './modules/professional/plans/plans.module';
import { ProfessionalModule } from './modules/professional/professional.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SeedModule } from './seed/seed.module';
import { CsrfGuard } from './shared/guards/csrf.guard';
import { LoggingInterceptor } from './shared/interceptors/loggin.interceptor';
import { SharedModule } from './shared/shared.module';
import { SafeThrottlerGuard } from './shared/guards/throttler.guard';
@Module({
  imports: [
    LibsSharedModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 300,
        getTracker: (req) => getClientIp(req as any) || req.ip || 'unknown',
      },
    ]),
    SharedModule,
    InnovateConnectModule,
    ProfessionalModule,
    ClientModule,
    WebhooksModule,
    PlansModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SafeThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
