import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import {
  GetProfileDetailsUseCase,
  UploadProfilePictureUseCase,
} from './use-cases';

@Module({
  controllers: [ProfileController],
  providers: [UploadProfilePictureUseCase, GetProfileDetailsUseCase],
})
export class ProfileModule {}
