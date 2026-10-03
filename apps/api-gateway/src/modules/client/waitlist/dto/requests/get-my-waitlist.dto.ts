import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetMyWaitlistDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'my-business' })
  business_slug?: string;
}
