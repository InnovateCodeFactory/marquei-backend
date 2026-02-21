import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AppUpdateAudience,
  AppUpdateMode,
  AppUpdateScope,
} from '@prisma/client';

export class InnovateConnectCreateAppUpdateModalDto {
  @IsEnum(AppUpdateMode)
  mode: AppUpdateMode;

  @IsOptional()
  @IsEnum(AppUpdateAudience)
  audience?: AppUpdateAudience;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  @IsOptional()
  @IsString()
  whats_new_items?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  primary_button_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  secondary_button_label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  target_version_ios?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  target_version_android?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_build_ios?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_build_android?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cta_path?: string;

  @IsOptional()
  @IsEnum(AppUpdateScope)
  cta_scope?: AppUpdateScope;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  banner_file_name?: string;
}

