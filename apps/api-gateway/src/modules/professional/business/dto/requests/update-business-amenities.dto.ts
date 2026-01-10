import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateBusinessAmenitiesDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @ApiProperty({
    description: 'Amenity IDs selected for the business',
    example: ['ckx123', 'ckx456'],
  })
  amenity_ids: string[];
}
