import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

export class CreateServiceComboDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nome do combo',
    example: 'Pacote barba + cabelo',
  })
  name: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Descrição opcional do combo',
    example: 'Pacote promocional para atendimento completo',
  })
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  @ApiProperty({
    description: 'Lista de serviços que pertencem ao combo',
    type: String,
    isArray: true,
  })
  service_ids: string[];

  @IsEnum(ServiceComboPricingModeDto)
  @ApiProperty({
    description: 'Estratégia de preço do combo',
    enum: ServiceComboPricingModeDto,
    example: ServiceComboPricingModeDto.PERCENT_DISCOUNT,
  })
  pricing_mode: ServiceComboPricingModeDto;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Preço final do combo em centavos (obrigatório quando pricing_mode = FIXED_PRICE)',
    example: 7990,
  })
  fixed_price_in_cents?: number;

  @Min(0)
  @Max(100)
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Percentual de desconto aplicado sobre a soma dos serviços (obrigatório quando pricing_mode = PERCENT_DISCOUNT)',
    example: 15,
  })
  discount_percent?: number;

  @IsEnum(ServiceComboDurationModeDto)
  @ApiProperty({
    description: 'Estratégia de duração do combo',
    enum: ServiceComboDurationModeDto,
    example: ServiceComboDurationModeDto.SUM_SERVICES,
  })
  duration_mode: ServiceComboDurationModeDto;

  @IsInt()
  @IsPositive()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Duração final do combo em minutos (obrigatório quando duration_mode = CUSTOM)',
    example: 90,
  })
  custom_duration_minutes?: number;

  @IsString()
  @IsOptional()
  @Matches(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
  @ApiPropertyOptional({
    description: 'Cor do combo para exibição em calendário',
    example: '#4647FA',
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
