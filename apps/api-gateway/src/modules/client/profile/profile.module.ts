import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import {
  EditProfileUseCase,
  GetProfileDetailsUseCase,
  UploadProfilePictureUseCase,
} from './use-cases';

@Module({
  controllers: [ProfileController],
  providers: [
    UploadProfilePictureUseCase,
    GetProfileDetailsUseCase,
    EditProfileUseCase,
  ],
})
export class ProfileModule {}
