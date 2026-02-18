import { ApiProperty } from '@nestjs/swagger';
import { BusinessReminderType } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class TestBusinessNotificationMessageDto {
  @IsEnum(BusinessReminderType)
  @ApiProperty({
    description: 'Reminder type used only to contextualize the preview message',
    enum: BusinessReminderType,
    example: BusinessReminderType.APPOINTMENT_REMINDER,
  })
  type: BusinessReminderType;

  @IsString()
  @MaxLength(3000)
  @ApiProperty({
    description:
      'Template currently being edited on app. It does not need to be saved in DB.',
    example:
      'Lembrete: você tem {{service_name}} com {{professional_name}} {{day_with_preposition}} às {{time}}.',
  })
  message_template: string;
}

