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
import { EditPreferredContentDto } from './dto/requests/edit-preffered-content.dto';
import { EditProfileDto } from './dto/requests/edit-profile.dto';
import { GetGeneralLinkDto } from './dto/requests/get-general-link.dto';
import { ReportBugDto } from './dto/requests/report-bug.dto';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import {
  EditPreferredContentUseCase,
  EditProfileUseCase,
  GetGeneralLinkByKeyUseCase,
  GetGeneralLinksUseCase,
  GetProfileDetailsUseCase,
  ReportBugUseCase,
  UploadProfilePictureUseCase,
} from './use-cases';

@Controller('client/profile')
@ApiTags('Clients - Profile')
export class ProfileController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly uploadProfilePictureUseCase: UploadProfilePictureUseCase,
    private readonly getProfileDetailsUseCase: GetProfileDetailsUseCase,
    private readonly editProfileUseCase: EditProfileUseCase,
    private readonly reportBugUseCase: ReportBugUseCase,
    private readonly editPreferredContentUseCase: EditPreferredContentUseCase,
    private readonly getGeneralLinksUseCase: GetGeneralLinksUseCase,
    private readonly getGeneralLinkByKeyUseCase: GetGeneralLinkByKeyUseCase,
  ) {}

  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype))
          return cb(new BadRequestException('Tipo inválido'), false);
        cb(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload profile image' })
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
  @ApiOperation({ summary: 'Get profile details' })
  async getProfileDetails(@Req() req: AppRequest, @Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getProfileDetailsUseCase.execute(req),
      res,
    });
  }

  @Patch('me')
  @ApiOperation({ summary: 'Edit profile' })
  async editProfile(
    @Req() req: AppRequest,
    @Body() dto: EditProfileDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.editProfileUseCase.execute(dto, req),
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

  @Patch('preferred-content')
  @ApiOperation({ summary: 'Edit preferred content' })
  async editPreferredContent(
    @Req() req: AppRequest,
    @Body() dto: EditPreferredContentDto,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.editPreferredContentUseCase.execute(dto, req),
      res,
    });
  }

  @Get('general-links')
  @IsPublic()
  @ApiOperation({ summary: 'Get system general links' })
  async getGeneralLinks(@Res() res: Response) {
    return await this.responseHandler.handle({
      method: () => this.getGeneralLinksUseCase.execute(),
      res,
    });
  }

  @Get('general-link')
  @IsPublic()
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
}
