import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BlockTimesDto } from './dto/requests/block-times.dto';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { ConfirmAppointmentDto } from './dto/requests/confirm-appointment.dto';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';
import { GetAvailableTimesDto } from './dto/requests/get-available-times.dto';
import { GetAppointmentsDto } from './dto/requests/get-appointments.dto';
import { RequestAppointmentConfirmationDto } from './dto/requests/request-appointment-confirmation.dto';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import {
  ConfirmAppointmentUseCase,
  CreateAppointmentUseCase,
  GetAppointmentsUseCase,
  GetAvailableTimesUseCase,
  RequestAppointmentConfirmationUseCase,
} from './use-cases';
import { BlockTimesUseCase } from './use-cases/block-times.use-case';
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case';
import { DeleteBlockedTimeUseCase } from './use-cases/delete-blocked-time.use-case';
import { ListBlockedTimesUseCase } from './use-cases/get-blocked-times.use-case';
import { RescheduleAppointmentUseCase } from './use-cases/reschedule-appointment.use-case';

@Controller('professional/appointments')
@ApiTags('Professional - Appointments')
export class AppointmentsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly getAvailableTimesUseCase: GetAvailableTimesUseCase,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getAppointmentsUseCase: GetAppointmentsUseCase,
    private readonly requestAppointmentConfirmationUseCase: RequestAppointmentConfirmationUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
    private readonly blockTimesUseCase: BlockTimesUseCase,
    private readonly listBlockedTimesUseCase: ListBlockedTimesUseCase,
    private readonly deleteBlockedTimeUseCase: DeleteBlockedTimeUseCase,
  ) {}

  @Get('get-available-times')
  @ApiOperation({
    summary: 'Retrieve available appointment times for a service',
    description:
      'Fetches available times for a specific service based on the provided start date.',
  })
  async getAvailableTimes(
    @Query() query: GetAvailableTimesDto,
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getAvailableTimesUseCase.execute(query, user),
      res,
    });
  }

  @Post('create-appointment')
  @ApiOperation({
    summary: 'Create a new appointment',
    description:
      'Creates a new appointment for a customer with the specified professional and service.',
  })
  async createAppointment(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: CreateAppointmentDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createAppointmentUseCase.execute(body, req),
      res,
    });
  }

  @Get('get-appointments')
  @ApiOperation({
    summary: 'Retrieve appointments for the current professional',
    description:
      'Fetches all appointments for the current professional profile, filtered by status.',
  })
  async getAppointments(
    @Res() res: Response,
    @Query() query: GetAppointmentsDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getAppointmentsUseCase.execute(user, query),
      res,
    });
  }

  @Post('cancel-appointment')
  @ApiOperation({
    summary: 'Cancel an appointment',
    description: 'Cancels an existing appointment by its ID.',
  })
  async cancelAppointment(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: CancelAppointmentDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.cancelAppointmentUseCase.execute(body, req),
      res,
    });
  }

  @Post('reschedule-appointment')
  @ApiOperation({
    summary: 'Reschedule an appointment',
    description: 'Reschedules an existing appointment to a new date and time.',
  })
  async rescheduleAppointment(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: RescheduleAppointmentDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.rescheduleAppointmentUseCase.execute(body, req),
      res,
    });
  }

  @Post('request-confirmation')
  @ApiOperation({
    summary: 'Request appointment confirmation',
    description:
      'Requests confirmation for a pending appointment and sends a WhatsApp message to the customer.',
  })
  async requestConfirmation(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: RequestAppointmentConfirmationDto,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.requestAppointmentConfirmationUseCase.execute(body, req),
      res,
    });
  }

  @Post('confirm-appointment')
  @ApiOperation({
    summary: 'Confirm appointment manually',
    description:
      'Confirms a pending appointment directly by the professional.',
  })
  async confirmAppointment(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: ConfirmAppointmentDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.confirmAppointmentUseCase.execute(body, req),
      res,
    });
  }

  @Post('block-times')
  @ApiOperation({
    summary: 'Block time ranges for a professional',
    description:
      'Blocks one or more intervals (whole days or partial) for a professional profile. Returns the planned blocks (no persistence yet).',
  })
  async blockTimes(
    @Res() res: Response,
    @Req() req: AppRequest,
    @Body() body: BlockTimesDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.blockTimesUseCase.execute(body, req),
      res,
    });
  }

  @Get('blocked-times')
  @ApiOperation({
    summary: 'List blocked time ranges',
    description:
      'Lists currently blocked time ranges. Returns empty until persistence is added.',
  })
  async listBlockedTimes(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.listBlockedTimesUseCase.execute(user),
      res,
    });
  }

  @Delete('blocked-times/:id')
  @ApiOperation({
    summary: 'Delete a blocked time range',
    description:
      'Deletes a blocked time range by id. No-op until persistence is added.',
  })
  async deleteBlockedTime(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: AppRequest,
  ) {
    return await this.responseHandler.handle({
      method: () => this.deleteBlockedTimeUseCase.execute(id, req),
      res,
    });
  }
}
