import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export const businessOfferingTypes = ['SERVICE', 'COMBO', 'PACKAGE'] as const;
export type BusinessOfferingType = (typeof businessOfferingTypes)[number];

export class GetBusinessOfferingsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Slug do estabelecimento',
    example: 'barbearia-exemplo',
  })
  slug: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Página para paginação',
    example: '1',
  })
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Quantidade de itens por página',
    example: '20',
  })
  limit: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description:
      'Busca por nome, duração ou valor (funciona para serviços e combos)',
    example: 'corte',
  })
  search?: string;

  @IsOptional()
  @IsIn(businessOfferingTypes)
  @ApiPropertyOptional({
    enum: businessOfferingTypes,
    default: 'SERVICE',
    description:
      'Tipo de oferta exibida na aba de serviços (pronto para futuros tipos)',
  })
  type?: BusinessOfferingType;
}
