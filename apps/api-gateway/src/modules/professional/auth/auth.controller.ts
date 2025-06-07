import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { LoginDto } from './dto/requests/login.dto';
import { RegisterProfessionalUserDto } from './dto/requests/register-professional-user';
import { LoginUseCase, RegisterProfessionalUserUseCase } from './use-cases';

@Controller('professional/auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerProfessionalUserUseCase: RegisterProfessionalUserUseCase,
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
