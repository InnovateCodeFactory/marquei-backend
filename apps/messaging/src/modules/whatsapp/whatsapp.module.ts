import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import {
  SendValidationTokenUseCase,
  SendWhatsAppTextMessageUseCase,
} from './use-cases';
import { WhatsAppBaseService } from './whatsapp-base.service';

@Module({
  imports: [HttpModule],
  providers: [
    WhatsAppBaseService,
    SendValidationTokenUseCase,
    SendWhatsAppTextMessageUseCase,
  ],
  exports: [WhatsAppBaseService],
})
export class WhatsappModule {}
