import { SharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { ClientModule } from './modules/client/client.module';
import { PlansModule } from './modules/professional/plans/plans.module';
import { ProfessionalModule } from './modules/professional/professional.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    SharedModule,
    ProfessionalModule,
    ClientModule,
    WebhooksModule,
    PlansModule,
    SeedModule,
  ],
})
export class AppModule {}
