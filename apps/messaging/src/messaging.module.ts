import { SharedModule } from '@app/shared';
import { Module } from '@nestjs/common';

@Module({
  imports: [SharedModule],
})
export class MessagingModule {}
