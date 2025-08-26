import { Module } from '@nestjs/common';
import { BusinessCategoryAndServiceTypeSeed } from './business-category-and-service-type.seed';
import { MailTemplatesSeed } from './mail-templates.seed';
import { SeedProfessionalPlansUseCase } from './plans.seed';

@Module({
  providers: [
    BusinessCategoryAndServiceTypeSeed,
    SeedProfessionalPlansUseCase,
    MailTemplatesSeed,
  ],
  exports: [
    BusinessCategoryAndServiceTypeSeed,
    SeedProfessionalPlansUseCase,
    MailTemplatesSeed,
  ],
})
export class SeedModule {}
