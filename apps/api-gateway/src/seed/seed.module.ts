import { Module } from '@nestjs/common';
import { AmenitiesSeed } from './amenities.seed';
import { BusinessCategoryAndServiceTypeSeed } from './business-category-and-service-type.seed';
import { MailTemplatesSeed } from './mail-templates.seed';
import { SeedProfessionalPlansUseCase } from './plans.seed';

@Module({
  providers: [
    BusinessCategoryAndServiceTypeSeed,
    SeedProfessionalPlansUseCase,
    MailTemplatesSeed,
    AmenitiesSeed,
  ],
  exports: [
    BusinessCategoryAndServiceTypeSeed,
    SeedProfessionalPlansUseCase,
    MailTemplatesSeed,
    AmenitiesSeed,
  ],
})
export class SeedModule {}
