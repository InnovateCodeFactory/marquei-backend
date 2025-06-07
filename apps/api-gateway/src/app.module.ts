import { SharedModule } from '@app/shared';
import { AuthGuard } from '@app/shared/guards/auth.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClientModule } from './modules/client/client.module';
import { ProfessionalModule } from './modules/professional/professional.module';

@Module({
  imports: [SharedModule, ProfessionalModule, ClientModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
