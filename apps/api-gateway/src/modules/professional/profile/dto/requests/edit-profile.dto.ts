import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class EditProfessionalProfileDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nome completo' })
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiPropertyOptional({ description: 'Telefone (somente números ou formato livre)' })
  phone?: string | null;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ApiPropertyOptional({ description: 'E-mail do usuário' })
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @ApiPropertyOptional({ description: 'CPF (somente números)' })
  document_number?: string | null;
}

