import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import {
  CheckBusinessSlugUseCase,
  SendMailValidationTokenUseCase,
  SendPhoneValidationTokenUseCase,
  ValidateMailUseCase,
  ValidatePhoneUseCase,
} from './use-cases';

@Module({
  controllers: [OnboardingController],
  providers: [
    CheckBusinessSlugUseCase,
    SendPhoneValidationTokenUseCase,
    ValidatePhoneUseCase,
    SendMailValidationTokenUseCase,
    ValidateMailUseCase,
  ],
})
export class OnboardingModule {}
