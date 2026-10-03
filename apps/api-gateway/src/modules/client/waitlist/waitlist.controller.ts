import { ResponseHandlerService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
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
import { GetMyWaitlistDto } from './dto/requests/get-my-waitlist.dto';
import { JoinWaitlistDto } from './dto/requests/join-waitlist.dto';
import {
  AcceptWaitlistOfferUseCase,
  DeclineWaitlistOfferUseCase,
  GetMyWaitlistUseCase,
  GetWaitlistOfferUseCase,
  JoinWaitlistUseCase,
  LeaveWaitlistUseCase,
} from './use-cases';

@Controller('client/waitlist')
@ApiTags('Clients - Waitlist')
export class WaitlistController {
  constructor(
    private readonly responseHandler: ResponseHandlerService,
    private readonly joinWaitlistUseCase: JoinWaitlistUseCase,
    private readonly leaveWaitlistUseCase: LeaveWaitlistUseCase,
    private readonly getMyWaitlistUseCase: GetMyWaitlistUseCase,
    private readonly getWaitlistOfferUseCase: GetWaitlistOfferUseCase,
    private readonly acceptWaitlistOfferUseCase: AcceptWaitlistOfferUseCase,
    private readonly declineWaitlistOfferUseCase: DeclineWaitlistOfferUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Entrar na lista de espera de um dia lotado' })
  async join(
    @Res() res: Response,
    @Body() body: JoinWaitlistDto,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.joinWaitlistUseCase.execute(body, req),
      res,
      successStatus: 201,
    });
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Minhas entradas ativas, com posição e oferta pendente',
  })
  async mine(
    @Res() res: Response,
    @Query() query: GetMyWaitlistDto,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.getMyWaitlistUseCase.execute(query, req),
      res,
    });
  }

  @Get('offers/:id')
  @ApiOperation({ summary: 'Detalhe de uma oferta de vaga' })
  async offer(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.getWaitlistOfferUseCase.execute(id, req),
      res,
    });
  }

  @Post('offers/:id/accept')
  @ApiOperation({ summary: 'Aceitar a vaga ofertada (vira agendamento)' })
  async accept(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.acceptWaitlistOfferUseCase.execute(id, req),
      res,
      successStatus: 201,
    });
  }

  @Post('offers/:id/decline')
  @ApiOperation({ summary: 'Recusar a vaga ofertada' })
  async decline(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.declineWaitlistOfferUseCase.execute(id, req),
      res,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Sair da lista de espera' })
  async leave(
    @Res() res: Response,
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    return this.responseHandler.handle({
      method: () => this.leaveWaitlistUseCase.execute(id, req),
      res,
    });
  }
}
