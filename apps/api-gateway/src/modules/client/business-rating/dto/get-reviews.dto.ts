import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class GetReviewsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Business Slug',
    example: 'my-business',
  })
  business_slug: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Page number for pagination',
    example: '1',
  })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Number of items per page',
    example: '10',
  })
  limit: string;
}
