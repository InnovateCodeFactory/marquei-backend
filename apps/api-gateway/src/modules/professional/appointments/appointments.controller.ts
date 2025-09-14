import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CancelAppointmentDto } from './dto/requests/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';
import { GetAvailableTimesDto } from './dto/requests/get-available-times.dto';
import { RescheduleAppointmentDto } from './dto/requests/reschedule-appointment.dto';
import {
  CreateAppointmentUseCase,
  GetAppointmentsUseCase,
  GetAvailableTimesUseCase,
} from './use-cases';
import { CancelAppointmentUseCase } from './use-cases/cancel-appointment.use-case';
import { RescheduleAppointmentUseCase } from './use-cases/reschedule-appointment.use-case';

@Controller('professional/appointments')
@ApiTags('Appointments')
export class AppointmentsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getAvailableTimesUseCase: GetAvailableTimesUseCase,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getAppointmentsUseCase: GetAppointmentsUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly rescheduleAppointmentUseCase: RescheduleAppointmentUseCase,
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
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getAppointmentsUseCase.execute(user),
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
}
