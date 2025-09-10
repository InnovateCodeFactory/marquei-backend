import { IsTaxNumberValidConstraint } from '@app/shared/validators/is-taxnumber-valid.validor';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsOptional,
  IsString,
  Validate,
} from 'class-validator';
import { isValid, parse } from 'date-fns';

export class EditProfileDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ description: 'Nome completo' })
  name?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiPropertyOptional({
    description: 'Telefone (somente números ou formato livre)',
  })
  phone?: string;

  @IsEmail()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ApiPropertyOptional({ description: 'E-mail do usuário' })
  email?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value !== 'string') return value;

    const d = parse(value, 'yyyy-MM-dd', new Date());
    if (!isValid(d)) return value; // deixará o @IsDate reprovar

    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  })
  @IsDate({ message: 'Data inválida' })
  @ApiPropertyOptional({ description: 'Data de nascimento (yyyy-MM-dd)' })
  birthdate?: Date | null;

  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Validate(IsTaxNumberValidConstraint)
  @ApiPropertyOptional({ description: 'CPF (somente números)' })
  document_number?: string | null;
}
