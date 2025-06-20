import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class FirstAccessDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).*$/, {
    message:
      'Password must contain at least one uppercase letter and one special character',
  })
  @MinLength(6, {
    message: 'Password must be at least 6 characters',
  })
  newPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  mailRequestId: string;
}
