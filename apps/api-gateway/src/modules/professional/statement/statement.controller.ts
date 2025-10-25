import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest, CurrentUser } from '@app/shared/types/app-request';
import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetProfessionalStatementByIdDto } from './dto/requests/get-by-id.dto';
import { GetStatementDto } from './dto/requests/get-statement.dto';
import {
  GetProfessionalStatementByIdUseCase,
  GetStatementUseCase,
} from './use-cases';

@Controller('professional/statement')
@ApiTags('Professional - Statement')
export class StatementController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,

    private readonly getStatementUseCase: GetStatementUseCase,
    private readonly getProfessionalStatementByIdUseCase: GetProfessionalStatementByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get Professional Statement',
    description: 'Retrieve a professional statement based on various filters.',
  })
  async getStatement(
    @Query() query: GetStatementDto,
    @CurrentUserDecorator() user: CurrentUser,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () => this.getStatementUseCase.execute(query, user),
      res,
    });
  }

  @Get('by-id')
  @ApiOperation({
    summary: 'Get Professional Statement by ID',
    description: 'Retrieve a professional statement by its unique ID.',
  })
  async getStatementById(
    @Query() query: GetProfessionalStatementByIdDto,
    @Req() req: AppRequest,
    @Res() res: Response,
  ) {
    return await this.responseHandler.handle({
      method: () =>
        this.getProfessionalStatementByIdUseCase.execute(query, req),
      res,
    });
  }
}
