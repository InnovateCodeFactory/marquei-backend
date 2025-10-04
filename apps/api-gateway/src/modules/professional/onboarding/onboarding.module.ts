import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import {
  SendMailValidationTokenUseCase,
  SendPhoneValidationTokenUseCase,
  ValidateMailUseCase,
  ValidatePhoneUseCase,
} from './use-cases';

@Module({
  controllers: [OnboardingController],
  providers: [
    SendPhoneValidationTokenUseCase,
    ValidatePhoneUseCase,
    SendMailValidationTokenUseCase,
    ValidateMailUseCase,
  ],
})
export class OnboardingModule {}

