import { IsNotEmpty, IsString } from 'class-validator';

export class WelcomeMessageDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  professionalProfileId: string;

  constructor(props: {
    title: string;
    message: string;
    professionalProfileId: string;
  }) {
    Object.assign(this, props);
  }
}
