import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { ProfessionalProfileController } from './profile.controller';
import {
  EditProfessionalProfileUseCase,
  GetProfessionalProfileDetailsUseCase,
  UploadProfessionalProfilePictureUseCase,
} from './use-cases';
import { GetGeneralLinksUseCase } from './use-cases/get-general-links.use-case';
import { GetGeneralLinkByKeyUseCase } from './use-cases/get-general-link-by-key.use-case';

@Module({
  controllers: [ProfessionalProfileController],
  providers: [
    ResponseHandlerService,
    EditProfessionalProfileUseCase,
    GetProfessionalProfileDetailsUseCase,
    UploadProfessionalProfilePictureUseCase,
    GetGeneralLinksUseCase,
    GetGeneralLinkByKeyUseCase,
  ],
})
export class ProfessionalProfileModule {}
