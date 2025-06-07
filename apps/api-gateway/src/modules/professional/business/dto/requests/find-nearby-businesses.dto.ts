import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

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

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Radius in meters to search for nearby businesses',
    example: 5000,
  })
  radius: number;
}
