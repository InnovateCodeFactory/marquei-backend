import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  ServiceComboDurationModeDto,
  ServiceComboPricingModeDto,
} from './combo.enums';

export class UpdateServiceComboDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Nome do combo',
    example: 'Pacote premium barba + cabelo',
  })
  name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descrição opcional do combo',
    example: 'Combo premium atualizado',
  })
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Lista completa de serviços do combo para substituição',
    type: String,
    isArray: true,
  })
  service_ids?: string[];

  @IsEnum(ServiceComboPricingModeDto)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estratégia de preço',
    enum: ServiceComboPricingModeDto,
  })
  pricing_mode?: ServiceComboPricingModeDto;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Preço final do combo em centavos',
    example: 9990,
  })
  fixed_price_in_cents?: number;

  @Min(0)
  @Max(100)
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Percentual de desconto sobre a soma dos serviços',
    example: 20,
  })
  discount_percent?: number;

  @IsEnum(ServiceComboDurationModeDto)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Estratégia de duração',
    enum: ServiceComboDurationModeDto,
  })
  duration_mode?: ServiceComboDurationModeDto;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Duração customizada em minutos',
    example: 120,
  })
  custom_duration_minutes?: number;

  @IsString()
  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
  @ApiPropertyOptional({
    description: 'Cor do combo para exibição em calendário',
    example: '#1E293B',
  })
  color?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Status ativo do combo',
    example: true,
  })
  is_active?: boolean;
}
