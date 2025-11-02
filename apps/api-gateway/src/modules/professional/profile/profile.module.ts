import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ProfessionalProfileController } from './profile.controller';
import {
  EditProfessionalProfileUseCase,
  GetProfessionalProfileDetailsUseCase,
  GetSelfNotificationsUseCase,
  ManageSelfNotificationsUseCase,
  ReportBugUseCase,
  UploadProfessionalProfilePictureUseCase,
} from './use-cases';
import { GetGeneralLinkByKeyUseCase } from './use-cases/get-general-link-by-key.use-case';
import { GetGeneralLinksUseCase } from './use-cases/get-general-links.use-case';

@Module({
  controllers: [ProfessionalProfileController],
  providers: [
    ResponseHandlerService,
    EditProfessionalProfileUseCase,
    GetProfessionalProfileDetailsUseCase,
    UploadProfessionalProfilePictureUseCase,
    GetGeneralLinksUseCase,
    GetGeneralLinkByKeyUseCase,
    ReportBugUseCase,
    ManageSelfNotificationsUseCase,
    GetSelfNotificationsUseCase,
  ],
})
export class ProfessionalProfileModule {}
