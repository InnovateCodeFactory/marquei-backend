import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RegisterVisitDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Device token (if not provided in header)' })
  device_token?: string;
}

