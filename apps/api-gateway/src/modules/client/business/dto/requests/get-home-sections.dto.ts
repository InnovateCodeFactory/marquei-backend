import { BusinessPublicTypeEnum } from '@app/shared/enum';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class GetHomeSectionsDto {
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

  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Number of businesses per section',
    example: 5,
  })
  limit?: number;

  @IsEnum(BusinessPublicTypeEnum)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'The public type of the business',
    example: BusinessPublicTypeEnum.MALE,
  })
  preferred_content?: BusinessPublicTypeEnum;
}
