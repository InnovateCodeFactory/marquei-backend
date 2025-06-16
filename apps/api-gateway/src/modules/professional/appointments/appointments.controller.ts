import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateAppointmentDto } from './dto/requests/create-appointment.dto';
import { GetAvailableTimesDto } from './dto/requests/get-available-times.dto';
import {
  CreateAppointmentUseCase,
  GetAvailableTimesUseCase,
} from './use-cases';

@Controller('professional/appointments')
@ApiTags('Appointments')
export class AppointmentsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getAvailableTimesUseCase: GetAvailableTimesUseCase,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
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
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateAppointmentDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createAppointmentUseCase.execute(body, user),
      res,
    });
  }
}
