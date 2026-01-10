import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckBusinessSlugDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Business name to check availability',
    example: 'Salao da Maria',
  })
  name: string;
}
