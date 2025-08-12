import { Module } from '@nestjs/common';
import { BusinessCategoryAndServiceTypeSeed } from './business-category-and-service-type.seed';
import { SeedProfessionalPlansUseCase } from './plans.seed';

@Module({
  providers: [BusinessCategoryAndServiceTypeSeed, SeedProfessionalPlansUseCase],
  exports: [BusinessCategoryAndServiceTypeSeed, SeedProfessionalPlansUseCase],
})
export class SeedModule {}
