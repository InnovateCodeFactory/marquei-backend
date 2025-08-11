import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export class FindNearbyBusinessesDto {
  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Latitude of the location to find nearby businesses',
    example: 37.7749,
  })
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Longitude of the location to find nearby businesses',
    example: -122.4194,
  })
  longitude: number;

  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Radius in meters to search for nearby businesses',
    example: '20000', // 20 km
    type: 'string',
  })
  radius?: number;

  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: '1',
  })
  page?: string;

  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Number of businesses to return per page',
    example: '5',
  })
  limit?: string;
}
