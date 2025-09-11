import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetReviewSummaryDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Business Slug',
    example: 'my-business',
  })
  business_slug: string;
}
