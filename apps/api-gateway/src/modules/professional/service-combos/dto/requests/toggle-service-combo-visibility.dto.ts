import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleServiceComboVisibilityDto {
  @ApiProperty({
    description: 'Define se o combo fica visível para agendamentos',
    example: true,
  })
  @IsBoolean()
  is_active: boolean;
}
