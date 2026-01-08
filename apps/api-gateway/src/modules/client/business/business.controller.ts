import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { OptionalAuthGuard } from '@app/shared/guards/optional-auth.guard';
import { ResponseHandlerService } from '@app/shared/services';
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FilterBusinessesDto } from './dto/requests/filter-businesses.dto';
import { FindNearbyBusinessesDto } from './dto/requests/find-nearby-businesses.dto';
import { FindRecommendedBusinessesDto } from './dto/requests/find-recommended-businesses.dto';
import { GetHomeSectionsDto } from './dto/requests/get-home-sections.dto';
import { GetSectionItemsDto } from './dto/requests/get-section-items.dto';
import { GetAvailableTimesForServiceAndProfessionalDto } from './dto/requests/get-available-times-for-service-and-professional.dto';
import { GetBusinessBySlugDto } from './dto/requests/get-business-by-slug.dto';
import { GetBusinessProfessionalsDto } from './dto/requests/get-business-professionals.dto';
import { GetProfessionalsForAppointmentDto } from './dto/requests/get-professionals.dto';
import { GetServicesDto } from './dto/requests/get-services.dto';
import {
  FilterBusinessesUseCase,
  FindNearbyBusinessesUseCase,
  FindRecommendedBusinessesUseCase,
  GetHomeSectionsUseCase,
  GetAvailableTimesForServiceAndProfessionalUseCase,
  GetBusinessBySlugUseCase,
  GetBusinessProfessionalsUseCase,
  GetBusinessCategoriesUseCase,
  GetSectionItemsUseCase,
  GetProfessionalsForAppointmentUseCase,
  GetServicesUseCase,
} from './use-cases';
import { AppRequest } from '@app/shared/types/app-request';

@Controller('client/business')
@ApiTags('Clients - Business')
export class BusinessController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly findNearbyBusinessesUseCase: FindNearbyBusinessesUseCase,
    private readonly findRecommendedBusinessesUseCase: FindRecommendedBusinessesUseCase,
    private readonly getHomeSectionsUseCase: GetHomeSectionsUseCase,
    private readonly getSectionItemsUseCase: GetSectionItemsUseCase,
    private readonly getBusinessBySlugUseCase: GetBusinessBySlugUseCase,
    private readonly getServicesUseCase: GetServicesUseCase,
    private readonly getProfessionalsForAppointmentUseCase: GetProfessionalsForAppointmentUseCase,
    private readonly getAvailableTimesForServiceAndProfessionalUseCase: GetAvailableTimesForServiceAndProfessionalUseCase,
    private readonly getBusinessCategoriesUseCase: GetBusinessCategoriesUseCase,
    private readonly filterBusinessesUseCase: FilterBusinessesUseCase,
    private readonly getBusinessProfessionalsUseCase: GetBusinessProfessionalsUseCase,
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

  @Post('recommended')
  @IsPublic()
  @ApiOperation({ summary: 'Find recommended businesses' })
  async findRecommendedBusinesses(
    @Body() body: FindRecommendedBusinessesDto,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.findRecommendedBusinessesUseCase.execute(body),
      res,
    });
  }

  @Post('sections')
  @IsPublic()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get dynamic home business sections' })
  async getHomeSections(
    @Body() body: GetHomeSectionsDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.getHomeSectionsUseCase.execute(body, req),
      res,
    });
  }

  @Post('section-items')
  @IsPublic()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get items for a specific section' })
  async getSectionItems(
    @Body() body: GetSectionItemsDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return this.responseHandler.handle({
      method: () => this.getSectionItemsUseCase.execute(body, req),
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

  @Get('professionals')
  @IsPublic()
  @ApiOperation({ summary: 'Get professionals for business' })
  async getBusinessProfessionals(
    @Res() res: Response,
    @Query() query: GetBusinessProfessionalsDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.getBusinessProfessionalsUseCase.execute(query),
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

  @Get('categories')
  @IsPublic()
  @ApiOperation({ summary: 'Get business categories' })
  async getBusinessCategories(@Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.getBusinessCategoriesUseCase.execute(),
      res,
    });
  }

  @Get('filter')
  @IsPublic()
  @ApiOperation({ summary: 'Filter businesses' })
  async filterBusinesses(
    @Res() res: Response,
    @Query() query: FilterBusinessesDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.filterBusinessesUseCase.execute(query),
      res,
    });
  }
}
