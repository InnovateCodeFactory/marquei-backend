import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FindNearbyBusinessesDto } from './dto/requests/find-nearby-businesses.dto';
import { GetAvailableTimesForServiceAndProfessionalDto } from './dto/requests/get-available-times-for-service-and-professional.dto';
import { GetBusinessBySlugDto } from './dto/requests/get-business-by-slug.dto';
import { GetProfessionalsForAppointmentDto } from './dto/requests/get-professionals.dto';
import { GetServicesDto } from './dto/requests/get-services.dto';
import {
  FindNearbyBusinessesUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';

@Controller('client/business')
@ApiTags('Business (Client)')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
    private readonly getBusinessBySlugUseCase: GetBusinessBySlugUseCase,
    private readonly getServicesUseCase: GetServicesUseCase,
    private readonly getProfessionalsForAppointmentUseCase: GetProfessionalsForAppointmentUseCase,
    private readonly getAvailableTimesForServiceAndProfessionalUseCase: GetAvailableTimesForServiceAndProfessionalUseCase,
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

  @Get('get-by-slug')
  @IsPublic()
  @ApiOperation({ summary: 'Get business by slug' })
  async getBusinessById(
    @Res() res: Response,
    @Query() query: GetBusinessBySlugDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.getBusinessBySlugUseCase.execute(query),
      res,
    });
  }

  @Get('services')
  @IsPublic()
  @ApiOperation({ summary: 'Get services for a business' })
  async getServices(@Res() res: Response, @Query() query: GetServicesDto) {
    return this.responseHandler.handle({
      method: () => this.getServicesUseCase.execute(query),
      res,
    });
  }

  @Get('professionals-for-appointment')
  @IsPublic()
  @ApiOperation({ summary: 'Get professionals for appointment' })
  async getProfessionalsForAppointment(
    @Res() res: Response,
    @Query() query: GetProfessionalsForAppointmentDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.getProfessionalsForAppointmentUseCase.execute(query),
      res,
    });
  }

  @Get('available-times-for-service-and-professional')
  @IsPublic()
  @ApiOperation({
    summary: 'Get available times for a service and professional',
  })
  async getAvailableTimesForServiceAndProfessional(
    @Res() res: Response,
    @Query() query: GetAvailableTimesForServiceAndProfessionalDto,
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.getAvailableTimesForServiceAndProfessionalUseCase.execute(query),
      res,
    });
  }
}
