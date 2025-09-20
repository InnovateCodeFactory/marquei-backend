import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddFavoriteDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Slug do estabelecimento', example: 'barbearia-x' })
  business_slug: string;
}

