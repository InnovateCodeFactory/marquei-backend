import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FirstAccessDto } from './dto/requests/firts-access.dto';
import { LoginDto } from './dto/requests/login.dto';
import { RegisterProfessionalUserDto } from './dto/requests/register-professional-user';
import { LoginUseCase, RegisterProfessionalUserUseCase } from './use-cases';
import { FirstAccessUseCase } from './use-cases/firts-access.use-case';

@Controller('professional/auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly registerProfessionalUserUseCase: RegisterProfessionalUserUseCase,
    private readonly responseHandler: ResponseHandlerService,
    private readonly firstAccessUseCase: FirstAccessUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login user',
  })
  @IsPublic()
  async login(@Res() res: Response, @Body() body: LoginDto) {
    return this.responseHandler.handle({
      method: () => this.loginUseCase.execute(body),
      res,
    });
  }

  @Post('first-access')
  @ApiOperation({
    summary: 'First access user',
  })
  async firtsAccess(
    @Res() res: Response,
    @Body() body: FirstAccessDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    console.log(currentUser);
    return this.responseHandler.handle({
      method: () => this.firstAccessUseCase.execute(body, currentUser.id),
      res,
    });
  }

  @Post('register-professional-user')
  @ApiOperation({
    summary: 'Register professional user',
  })
  @IsPublic()
  async registerProfessionalUser(
    @Res() res: Response,
    @Body() body: RegisterProfessionalUserDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.registerProfessionalUserUseCase.execute(body),
      res,
    });
  }
}
