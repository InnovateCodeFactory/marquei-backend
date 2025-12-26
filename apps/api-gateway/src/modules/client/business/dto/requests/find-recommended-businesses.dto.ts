import { BusinessPublicTypeEnum } from '@app/shared/enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class FindRecommendedBusinessesDto {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Latitude of the location to find recommended businesses (optional if location is disabled)',
    example: 37.7749,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Longitude of the location to find recommended businesses (optional if location is disabled)',
    example: -122.4194,
  })
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Radius in meters to search for recommended businesses',
    example: 50_000, // 50 km
  })
  radius?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
  })
  page?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Number of businesses to return per page',
    example: 5,
  })
  limit?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Category ID to filter businesses by category',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  category_id?: string;

  @IsEnum(BusinessPublicTypeEnum)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The public type of the business',
    example: BusinessPublicTypeEnum.MALE,
  })
  preferred_content?: BusinessPublicTypeEnum;
}
