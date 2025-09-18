import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import {
  EditPreferredContentUseCase,
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
    EditPreferredContentUseCase,
  ],
})
export class ProfileModule {}
