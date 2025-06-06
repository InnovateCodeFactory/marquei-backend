import { SharedModule } from '@app/shared';
import { AuthGuard } from '@app/shared/guards/auth.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { BusinessCategoryModule } from './modules/business-category/business-category.module';
import { BusinessServiceTypeModule } from './modules/business-service-type/business-service-type.module';
import { BusinessModule } from './modules/business/business.module';
import { CustomersModule } from './modules/customers/customers.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    BusinessServiceTypeModule,
    BusinessCategoryModule,
    BusinessModule,
    CustomersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
