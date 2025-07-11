import { CurrentUserDecorator } from '@app/shared/decorators/current-user.decorator';
import { ResponseHandlerService } from '@app/shared/services';
import { CurrentUser } from '@app/shared/types/app-request';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GetStatementDto } from './dto/requests/get-statement.dto';
import { GetStatementUseCase } from './use-cases';

@Controller('professional/statement')
@ApiTags('Professional Statement')
export class StatementController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly getStatementUseCase: GetStatementUseCase,
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
}
