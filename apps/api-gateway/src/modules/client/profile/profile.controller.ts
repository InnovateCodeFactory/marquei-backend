import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentCustomer } from '@app/shared/types/app-request';
import {
  BadRequestException,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UploadProfilePictureUseCase } from './use-cases';

@Controller('client/profile')
@ApiTags('Client Profile')
export class ProfileController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly uploadProfilePictureUseCase: UploadProfilePictureUseCase,
  ) {}

  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype))
          return cb(new BadRequestException('Tipo inválido'), false);
        cb(null, true);
      },
    }),
  )
  async uploadProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUserDecorator() user: CurrentCustomer,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.uploadProfilePictureUseCase.execute(file, user),
      res,
    });
  }
}
