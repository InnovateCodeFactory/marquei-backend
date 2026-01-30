import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterAppReviewEventDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['prompt_shown', 'prompt_dismissed', 'store_opened'])
  @ApiProperty({
    description: 'Evento de avaliação do app',
    example: 'prompt_shown',
  })
  event: 'prompt_shown' | 'prompt_dismissed' | 'store_opened';

  @IsString()
  @IsNotEmpty()
  @IsIn(['ios', 'android'])
  @ApiProperty({
    description: 'Plataforma do app',
    example: 'ios',
  })
  platform: 'ios' | 'android';

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Contexto da ação (ex: appointment_completed)',
    example: 'appointment_completed',
  })
  context?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Device ID (se disponível)',
    example: 'device-123',
  })
  device_id?: string;
}
