import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InnovateConnectAuthGuard } from './guards/innovate-connect-auth.guard';
import { InnovateConnectLoginDto } from './dto/requests/innovate-connect-login.dto';
import { InnovateConnectPaginationDto } from './dto/requests/innovate-connect-pagination.dto';
import {
  InnovateConnectCatalogUseCase,
  InnovateConnectListAppointmentsUseCase,
  InnovateConnectListBusinessesUseCase,
  InnovateConnectListLogsUseCase,
  InnovateConnectListServicesUseCase,
  InnovateConnectListSubscriptionsUseCase,
  InnovateConnectListUsersUseCase,
  InnovateConnectLoginUseCase,
} from './use-cases';

@Controller('innovate-connect')
@ApiTags('Innovate Connect')
@IsPublic()
export class InnovateConnectController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly loginUseCase: InnovateConnectLoginUseCase,
    private readonly catalogUseCase: InnovateConnectCatalogUseCase,
    private readonly listUsersUseCase: InnovateConnectListUsersUseCase,
    private readonly listBusinessesUseCase: InnovateConnectListBusinessesUseCase,
    private readonly listAppointmentsUseCase: InnovateConnectListAppointmentsUseCase,
    private readonly listServicesUseCase: InnovateConnectListServicesUseCase,
    private readonly listLogsUseCase: InnovateConnectListLogsUseCase,
    private readonly listSubscriptionsUseCase: InnovateConnectListSubscriptionsUseCase,
  ) {}

  @Post('auth/login')
  @IsPublic()
  async login(@Res() res: Response, @Body() body: InnovateConnectLoginDto) {
    return this.responseHandler.handle({
      method: () => this.loginUseCase.execute(body),
      res,
    });
  }

  @Get('catalog')
  @UseGuards(InnovateConnectAuthGuard)
  async catalog(@Res() res: Response) {
    return this.responseHandler.handle({
      method: () => this.catalogUseCase.execute(),
      res,
    });
  }

  @Get('users')
  @UseGuards(InnovateConnectAuthGuard)
  async listUsers(@Res() res: Response, @Query() query: InnovateConnectPaginationDto) {
    return this.responseHandler.handle({
      method: () => this.listUsersUseCase.execute(query),
      res,
    });
  }

  @Get('businesses')
  @UseGuards(InnovateConnectAuthGuard)
  async listBusinesses(
    @Res() res: Response,
    @Query() query: InnovateConnectPaginationDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.listBusinessesUseCase.execute(query),
      res,
    });
  }

  @Get('appointments')
  @UseGuards(InnovateConnectAuthGuard)
  async listAppointments(
    @Res() res: Response,
    @Query() query: InnovateConnectPaginationDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.listAppointmentsUseCase.execute(query),
      res,
    });
  }

  @Get('services')
  @UseGuards(InnovateConnectAuthGuard)
  async listServices(
    @Res() res: Response,
    @Query() query: InnovateConnectPaginationDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.listServicesUseCase.execute(query),
      res,
    });
  }

  @Get('logs')
  @UseGuards(InnovateConnectAuthGuard)
  async listLogs(@Res() res: Response, @Query() query: InnovateConnectPaginationDto) {
    return this.responseHandler.handle({
      method: () => this.listLogsUseCase.execute(query),
      res,
    });
  }

  @Get('subscriptions')
  @UseGuards(InnovateConnectAuthGuard)
  async listSubscriptions(
    @Res() res: Response,
    @Query() query: InnovateConnectPaginationDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.listSubscriptionsUseCase.execute(query),
      res,
    });
  }
}
