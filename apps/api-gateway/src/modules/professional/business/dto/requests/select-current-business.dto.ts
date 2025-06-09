import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectCurrentBusinessDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The slug of the currently selected business',
    example: 'example-business-slug',
  })
  current_selected_business_slug: string;
}
