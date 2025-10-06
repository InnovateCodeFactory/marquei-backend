import { ResponseHandlerService } from '@app/shared/services';
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import {
  GetBusinessByProfessionalUseCase,
  GetCurrentSubscriptionUseCase,
  GetProfessionalsUseCase,
  GetProfilePresentationUseCase,
} from './use-cases';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';
import { EditBusinessUseCase } from './use-cases/edit-business.use-case';
import { UploadBusinessImagesUseCase } from './use-cases/upload-business-images.use-case';
import { GetBusinessDetailsUseCase } from './use-cases/get-business-details.use-case';

@Module({
  controllers: [BusinessController],
  providers: [
    ResponseHandlerService,
    GetBusinessByProfessionalUseCase,
    SelectCurrentBusinessUseCase,
    GetCurrentSubscriptionUseCase,
    GetProfessionalsUseCase,
    GetProfilePresentationUseCase,
    EditBusinessUseCase,
    UploadBusinessImagesUseCase,
    GetBusinessDetailsUseCase,
  ],
})
export class BusinessModule {}
