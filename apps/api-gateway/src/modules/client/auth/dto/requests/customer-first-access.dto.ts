import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { GuestOrigin } from '@prisma/client';

export class CustomerFirstAccessDto {
  @IsObject()
  @IsNotEmpty()
  @ApiProperty({
    description: "The customer's device information",
  })
  device_info: Record<string, any>;

  @IsOptional()
  @IsEnum(GuestOrigin)
  @ApiPropertyOptional({
    description: 'Guest origin (APP or WEB)',
    enum: GuestOrigin,
    default: GuestOrigin.APP,
  })
  origin?: GuestOrigin;
}
