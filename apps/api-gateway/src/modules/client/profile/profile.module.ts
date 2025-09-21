import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import {
  EditPreferredContentUseCase,
  EditProfileUseCase,
  GetGeneralLinksUseCase,
  GetGeneralLinkByKeyUseCase,
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
    GetGeneralLinksUseCase,
    GetGeneralLinkByKeyUseCase,
  ],
})
export class ProfileModule {}
