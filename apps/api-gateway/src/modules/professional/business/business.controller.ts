import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SelectCurrentBusinessDto } from './dto/requests/select-current-business.dto';
import {
  GetBusinessByProfessionalUseCase,
  GetCurrentSubscriptionUseCase,
  GetProfessionalsUseCase,
  GetProfilePresentationUseCase,
  GetBusinessDetailsUseCase,
} from './use-cases';
import { GeocodeAddressUseCase } from './use-cases';
import { SelectCurrentBusinessUseCase } from './use-cases/select-current-business.use-case';
import { EditBusinessUseCase } from './use-cases/edit-business.use-case';
import { UploadBusinessImagesUseCase } from './use-cases/upload-business-images.use-case';
import { EditBusinessDto } from './dto/requests/edit-business.dto';
import { GeocodeAddressDto } from './dto/requests/geocode-address.dto';

@Controller('professional/business')
@ApiTags('Professional - Business')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getBusinessByProfessionalUseCase: GetBusinessByProfessionalUseCase,
    private readonly selectCurrentBusinessUseCase: SelectCurrentBusinessUseCase,
    private readonly getCurrentSubscriptionUseCase: GetCurrentSubscriptionUseCase,
    private readonly getProfessionalsUseCase: GetProfessionalsUseCase,
    private readonly getProfilePresentationUseCase: GetProfilePresentationUseCase,
    private readonly editBusinessUseCase: EditBusinessUseCase,
    private readonly uploadBusinessImagesUseCase: UploadBusinessImagesUseCase,
    private readonly getBusinessDetailsUseCase: GetBusinessDetailsUseCase,
    private readonly geocodeAddressUseCase: GeocodeAddressUseCase,
  ) {}

  @Get('get-business-by-professional')
  @ApiOperation({
    summary: 'Get business by professional',
    description:
      'This endpoint retrieves the business associated with a professional.',
  })
  async getBusinessByProfessional(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getBusinessByProfessionalUseCase.execute(currentUser),
      res,
    });
  }

  @Post('select-current-business')
  @ApiOperation({
    summary: 'Select current business',
    description:
      'This endpoint allows a professional to select their current business.',
  })
  async selectCurrentBusiness(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: SelectCurrentBusinessDto,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.selectCurrentBusinessUseCase.execute(payload, currentUser),
      res,
    });
  }

  @Get('get-current-subscription')
  @ApiOperation({
    summary: 'Get current subscription',
    description:
      'This endpoint retrieves the current subscription details for the selected business.',
  })
  async getCurrentSubscription(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getCurrentSubscriptionUseCase.execute(currentUser),
      res,
    });
  }

  @Get('get-professionals')
  @ApiOperation({
    summary: 'Get professionals',
    description:
      'This endpoint retrieves a list of professionals associated with the currently selected business.',
  })
  async getProfessionals(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getProfessionalsUseCase.execute(currentUser),
      res,
    });
  }

  @Get('get-profile-presentation')
  @ApiOperation({
    summary: 'Get profile presentation',
    description:
      'This endpoint retrieves the profile presentation details for the currently selected business.',
  })
  async getProfilePresentation(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getProfilePresentationUseCase.execute(currentUser),
      res,
    });
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current business details',
    description: 'Returns full editable details for the selected business.',
  })
  async getBusinessDetails(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getBusinessDetailsUseCase.execute(currentUser),
      res,
    });
  }

  @Patch()
  @ApiOperation({
    summary: 'Edit current business data',
    description:
      'Updates basic data of the currently selected business. Sends only changed fields.',
  })
  async editBusiness(
    @Res() res: Response,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() payload: EditBusinessDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.editBusinessUseCase.execute(currentUser, payload),
      res,
    });
  }

  @Post('profile-images')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'cover', maxCount: 1 },
    ], {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype))
          return cb(new Error('Tipo inválido'), false);
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload business logo and/or cover image',
    description:
      'Accepts multipart form-data with fields "logo" and/or "cover". Updates only provided ones.',
  })
  async uploadImages(
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.uploadBusinessImagesUseCase.execute(currentUser, files),
      res,
      successStatus: 201,
    });
  }

  @Post('geocode-address')
  @ApiOperation({
    summary: 'Geocode address with Mapbox',
    description:
      'Receives address parts and returns latitude and longitude using Mapbox.',
  })
  async geocodeAddress(
    @Res() res: Response,
    @Body() payload: GeocodeAddressDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.geocodeAddressUseCase.execute(payload),
      res,
    });
  }
}
