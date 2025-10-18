import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MarkNotificationAsReadDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID da notificação a ser marcada como lida',
  })
  notificationId: string;
}
