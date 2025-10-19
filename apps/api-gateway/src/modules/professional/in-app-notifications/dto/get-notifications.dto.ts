import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetNotificationsDto {
  @ApiProperty({ description: 'Page number for pagination', required: false })
  @IsString()
  @IsOptional()
  page?: string;

  @ApiProperty({ description: 'Items per page', required: false })
  @IsString()
  @IsOptional()
  limit?: string;
}

