import { IsNotEmpty, IsString } from 'class-validator';

export class NewAppointmentNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  professionalProfileId: string;

  constructor({
    title,
    body,
    professionalProfileId,
  }: {
    title: string;
    body: string;
    professionalProfileId: string;
  }) {
    this.title = title;
    this.message = body;
    this.professionalProfileId = professionalProfileId;
  }
}
