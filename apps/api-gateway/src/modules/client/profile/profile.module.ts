import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import {
  EditProfileUseCase,
  GetProfileDetailsUseCase,
  ReportBugUseCase,
  UploadProfilePictureUseCase,
} from './use-cases';

@Module({
  controllers: [ProfileController],
  providers: [
    UploadProfilePictureUseCase,
    GetProfileDetailsUseCase,
    EditProfileUseCase,
    ReportBugUseCase,
  ],
})
export class ProfileModule {}
