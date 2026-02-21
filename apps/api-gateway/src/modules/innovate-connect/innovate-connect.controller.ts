import { IsPublic } from '@app/shared/decorators/isPublic.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InnovateConnectCreateAppUpdateModalDto } from './dto/requests/innovate-connect-create-app-update-modal.dto';
import { InnovateConnectAuthGuard } from './guards/innovate-connect-auth.guard';
import { InnovateConnectLoginDto } from './dto/requests/innovate-connect-login.dto';
import { InnovateConnectListAppUpdatesDto } from './dto/requests/innovate-connect-list-app-updates.dto';
import { InnovateConnectPaginationDto } from './dto/requests/innovate-connect-pagination.dto';
import { InnovateConnectToggleAppUpdateModalDto } from './dto/requests/innovate-connect-toggle-app-update-modal.dto';
import {
  InnovateConnectCatalogUseCase,
  InnovateConnectCreateAppUpdateModalUseCase,
  InnovateConnectListAppUpdatesUseCase,
  InnovateConnectListAppointmentsUseCase,
  InnovateConnectListBusinessesUseCase,
  InnovateConnectListLogsUseCase,
  InnovateConnectListServicesUseCase,
  InnovateConnectListSubscriptionsUseCase,
  InnovateConnectListUsersUseCase,
  InnovateConnectLoginUseCase,
  InnovateConnectToggleAppUpdateModalUseCase,
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
    private readonly listAppUpdatesUseCase: InnovateConnectListAppUpdatesUseCase,
    private readonly createAppUpdateModalUseCase: InnovateConnectCreateAppUpdateModalUseCase,
    private readonly toggleAppUpdateModalUseCase: InnovateConnectToggleAppUpdateModalUseCase,
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

  @Get('app-updates')
  @UseGuards(InnovateConnectAuthGuard)
  async listAppUpdates(
    @Res() res: Response,
    @Query() query: InnovateConnectListAppUpdatesDto,
  ) {
    return this.responseHandler.handle({
      method: () => this.listAppUpdatesUseCase.execute(query),
      res,
    });
  }

  @Post('app-updates')
  @UseGuards(InnovateConnectAuthGuard)
  @UseInterceptors(
    FileInterceptor('banner', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Tipo de banner inválido'), false);
        }
        cb(null, true);
      },
    }),
  )
  async createAppUpdate(
    @Res() res: Response,
    @Body() body: InnovateConnectCreateAppUpdateModalDto,
    @UploadedFile() banner?: Express.Multer.File,
  ) {
    return this.responseHandler.handle({
      method: () => this.createAppUpdateModalUseCase.execute(body, banner),
      res,
      successStatus: 201,
    });
  }

  @Patch('app-updates/:id/active')
  @UseGuards(InnovateConnectAuthGuard)
  async setAppUpdateActive(
    @Res() res: Response,
    @Param('id') id: string,
    @Body() body: InnovateConnectToggleAppUpdateModalDto,
  ) {
    return this.responseHandler.handle({
      method: () =>
        this.toggleAppUpdateModalUseCase.execute({
          id,
          isActive: body.is_active,
        }),
      res,
    });
  }
}
