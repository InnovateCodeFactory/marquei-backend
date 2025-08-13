import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FindNearbyBusinessesDto } from './dto/requests/find-nearby-businesses.dto';
import { FindNearbyBusinessesUseCase } from './use-cases';

@Controller('client/business')
@ApiTags('Business (Client)')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
  ) {}

  @Post('nearby')
  @IsPublic()
  @ApiOperation({ summary: 'Find nearby businesses' })
  async findNearbyBusinesses(
    @Body() body: FindNearbyBusinessesDto,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.findNearbyBusinessesUseCase.execute(body),
      res,
    });
  }
}
