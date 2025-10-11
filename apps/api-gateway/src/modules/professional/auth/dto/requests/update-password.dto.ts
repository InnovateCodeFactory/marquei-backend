import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123!',
  })
  current_password: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'New password',
    example: 'newPassword123!',
  })
  new_password: string;
}
