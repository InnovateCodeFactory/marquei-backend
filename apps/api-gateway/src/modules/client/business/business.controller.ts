import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FindNearbyBusinessesDto } from './dto/requests/find-nearby-businesses.dto';
import { GetBusinessByIdDto } from './dto/requests/get-business-by-id.dto';
import {
  FindNearbyBusinessesUseCase,
  GetBusinessByIdUseCase,
} from './use-cases';

@Controller('client/business')
@ApiTags('Business (Client)')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
    private readonly getBusinessByIdUseCase: GetBusinessByIdUseCase,
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

  @Get('get-by-id')
  @IsPublic()
  @ApiOperation({ summary: 'Get business by ID' })
  async getBusinessById(
    @Res() res: Response,
    @Query() query: GetBusinessByIdDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.getBusinessByIdUseCase.execute(query),
      res,
    });
  }
}
