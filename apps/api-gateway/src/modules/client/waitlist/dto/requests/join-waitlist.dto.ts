import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class JoinWaitlistDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'my-business' })
  business_slug: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Profissional escolhido no agendamento' })
  professional_id: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Informe service_id ou combo_id' })
  service_id?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Informe service_id ou combo_id' })
  combo_id?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @ApiProperty({
    example: '2026-10-20',
    description: 'Dia lotado (yyyy-MM-dd)',
  })
  date: string;
}
