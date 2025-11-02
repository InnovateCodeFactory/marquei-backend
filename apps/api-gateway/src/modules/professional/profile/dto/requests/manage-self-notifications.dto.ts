import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ManageSelfNotificationsDto {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Enable or disable push notifications',
    example: true,
  })
  push_notification?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Enable or disable email notifications',
    example: false,
  })
  email_notification?: boolean;
}
