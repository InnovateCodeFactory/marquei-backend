import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessReminderType, ReminderChannel } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ManageBusinessNotificationsDto {
  @IsEnum(BusinessReminderType)
  @ApiProperty({
    description: 'Reminder setting type to be updated',
    enum: BusinessReminderType,
    example: BusinessReminderType.APPOINTMENT_REMINDER,
  })
  type: BusinessReminderType;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Enable or disable this reminder type',
    example: true,
  })
  is_active?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ReminderChannel, { each: true })
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Enabled channels for this reminder type',
    enum: ReminderChannel,
    isArray: true,
    example: ['PUSH', 'WHATSAPP'],
  })
  channels?: ReminderChannel[];

  @IsArray()
  @ArrayNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Minutes before appointment to send reminders',
    type: [Number],
    example: [1440, 60],
  })
  offsets_min_before?: number[];

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'IANA timezone for this reminder type',
    example: 'America/Sao_Paulo',
  })
  timezone?: string;

  @IsString()
  @MaxLength(3000)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Message template used for this reminder type',
    example:
      'Lembrete: você tem {{service_name}} com {{professional_name}} {{day_with_preposition}} às {{time}}.',
  })
  message_template?: string;
}
