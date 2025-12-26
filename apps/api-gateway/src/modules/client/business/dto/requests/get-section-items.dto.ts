import { BusinessPublicTypeEnum } from '@app/shared/enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetSectionItemsDto {
  @IsString()
  @IsIn(['recommended', 'nearby', 'state'])
  @ApiProperty({
    description: 'Section key to list items for',
    example: 'recommended',
  })
  section_key: string;

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
    example: 20,
  })
  limit?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Latitude of the current user (optional)',
    example: -23.5505,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Longitude of the current user (optional)',
    example: -46.6333,
  })
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Radius in meters to search nearby businesses',
    example: 20_000,
  })
  radius?: number;

  @IsEnum(BusinessPublicTypeEnum)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The public type of the business',
    example: BusinessPublicTypeEnum.MALE,
  })
  preferred_content?: BusinessPublicTypeEnum;
}
