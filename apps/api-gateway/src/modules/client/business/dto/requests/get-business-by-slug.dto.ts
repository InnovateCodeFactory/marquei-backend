import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetBusinessBySlugDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The slug of the business to retrieve',
    example: 'business-slug',
  })
  slug: string;
}
