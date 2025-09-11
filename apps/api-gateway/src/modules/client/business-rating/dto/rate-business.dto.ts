import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RateBusinessDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Business Slug',
    example: 'my-business',
  })
  business_slug: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Comment about the business',
    example: 'Great service and friendly staff!',
  })
  @MaxLength(200)
  comment?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @ApiProperty({
    description: 'Rating score from 1 to 5',
    example: 5,
  })
  score: number;
}
