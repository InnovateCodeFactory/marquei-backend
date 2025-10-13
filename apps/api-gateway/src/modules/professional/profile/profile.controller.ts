import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { EditProfessionalProfileDto } from './dto/requests/edit-profile.dto';
import { GetGeneralLinkDto } from './dto/requests/get-general-link.dto';
import {
  EditProfessionalProfileUseCase,
  GetProfessionalProfileDetailsUseCase,
  UploadProfessionalProfilePictureUseCase,
} from './use-cases';
import { GetGeneralLinkByKeyUseCase } from './use-cases/get-general-link-by-key.use-case';
import { GetGeneralLinksUseCase } from './use-cases/get-general-links.use-case';
import { ReportBugUseCase } from './use-cases';
import { ReportBugDto } from './dto/requests/report-bug.dto';

@Controller('professional/profile')
@ApiTags('Professional Profile')
export class ProfessionalProfileController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly uploadProfilePictureUseCase: UploadProfessionalProfilePictureUseCase,
    private readonly getProfileDetailsUseCase: GetProfessionalProfileDetailsUseCase,
    private readonly editProfileUseCase: EditProfessionalProfileUseCase,
    private readonly getGeneralLinksUseCase: GetGeneralLinksUseCase,
    private readonly getGeneralLinkByKeyUseCase: GetGeneralLinkByKeyUseCase,
    private readonly reportBugUseCase: ReportBugUseCase,
  ) {}

  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype))
          return cb(new BadRequestException('Tipo inválido'), false);
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload professional profile image' })
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUserDecorator() user: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.uploadProfilePictureUseCase.execute(file, user),
      res,
      successStatus: 201,
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get professional profile details' })
  async getProfileDetails(@Req() req: AppRequest, @Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getProfileDetailsUseCase.execute(req),
      res,
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Edit professional profile' })
  async editProfile(
    @Req() req: AppRequest,
    @Body() dto: EditProfessionalProfileDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.editProfileUseCase.execute(dto, req),
      res,
    });
  }

  @Get('general-links')
  @ApiOperation({ summary: 'Get system general links' })
  async getGeneralLinks(@Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getGeneralLinksUseCase.execute(),
      res,
    });
  }

  @Get('general-link')
  @ApiOperation({ summary: 'Get a specific system link by key' })
  async getGeneralLink(
    @Res() res: Response,
    @Query() query: GetGeneralLinkDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getGeneralLinkByKeyUseCase.execute(query),
      res,
    });
  }

  @Post('report-bug')
  @ApiOperation({ summary: 'Report a bug' })
  async reportBug(
    @Req() req: AppRequest,
    @Body() dto: ReportBugDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.reportBugUseCase.execute(dto, req),
      res,
      successStatus: 201,
    });
  }
}
