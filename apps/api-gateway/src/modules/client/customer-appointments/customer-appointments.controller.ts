import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CreateCustomerAppointmentDto } from './dto/requests/create-customer-appointment.dto';
import { GetCustomerAppointmentsDto } from './dto/requests/get-customer-appointments.dto';
import {
  CreateAppointmentUseCase,
  GetCustomerAppointmentsUseCase,
  GetNextAppointmentUseCase,
} from './use-cases';

@Controller('client/customer-appointments')
@ApiTags('Customer Appointments')
export class CustomerAppointmentsController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getNextAppointmentUseCase: GetNextAppointmentUseCase,
    private readonly getCustomerAppointmentsUseCase: GetCustomerAppointmentsUseCase,
  ) {}

  @Post('create-appointment')
  @ApiOperation({ summary: 'Create a new customer appointment' })
  async createAppointment(
    @Res() res: Response,
    @Body() payload: CreateCustomerAppointmentDto,
    @Req() req: AppRequest,
  ) {
    return await this.responseHandler.handle({
      method: () => this.createAppointmentUseCase.execute(payload, req),
      res,
      successStatus: 201,
    });
  }

  @Get('next-appointment')
  @ApiOperation({ summary: 'Get the next appointment for the customer' })
  async getNextAppointment(@Res() res: Response, @Req() req: AppRequest) {
    return await this.responseHandler.handle({
      method: () => this.getNextAppointmentUseCase.execute(req),
      res,
    });
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get all appointments for the customer' })
  async getAppointments(
    @Res() res: Response,
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: GetCustomerAppointmentsDto,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getCustomerAppointmentsUseCase.execute(query, user),
      res,
    });
  }
}
