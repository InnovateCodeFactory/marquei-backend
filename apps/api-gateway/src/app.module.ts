import { SharedModule } from '@app/shared';
import { AuthGuard } from '@app/shared/guards/auth.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClientModule } from './modules/client/client.module';
import { PlansModule } from './modules/professional/plans/plans.module';
import { ProfessionalModule } from './modules/professional/professional.module';
import { QueueModule } from './modules/queue/queue.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    SharedModule,
    ClientModule,
    ProfessionalModule,
    WebhooksModule,
    PlansModule,
    SeedModule,
    QueueModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
