import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SendValidationTokenUseCase } from './use-cases';
import { WhatsAppBaseService } from './whatsapp-base.service';

@Module({
  imports: [HttpModule],
  providers: [WhatsAppBaseService, SendValidationTokenUseCase],
  exports: [WhatsAppBaseService],
})
export class WhatsappModule {}
