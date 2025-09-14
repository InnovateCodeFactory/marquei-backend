import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import {
  SendPhoneValidationTokenUseCase,
  ValidatePhoneUseCase,
} from './use-cases';

@Module({
  controllers: [OnboardingController],
  providers: [SendPhoneValidationTokenUseCase, ValidatePhoneUseCase],
})
export class OnboardingModule {}
