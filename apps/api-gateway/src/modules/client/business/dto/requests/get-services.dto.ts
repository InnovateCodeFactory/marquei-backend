import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class GetServicesDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The slug of the business to get services for',
    example: 'example-business-slug',
  })
  slug: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The page number for pagination',
    example: '1',
  })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The number of items per page for pagination',
    example: '10',
  })
  limit: string;
}
