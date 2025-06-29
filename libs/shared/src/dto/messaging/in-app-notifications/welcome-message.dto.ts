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

  constructor({
    professionalName,
    professionalProfileId,
  }: {
    professionalName: string;
    professionalProfileId: string;
  }) {
    this.title = 'Bem-vindo(a) ao Marquei!';
    this.message = `Olá ${this.getFirstName(professionalName)}, seja bem-vindo(a) ao Marquei! Estamos felizes em tê-lo(a) conosco!`;
    this.professionalProfileId = professionalProfileId;
  }

  private getFirstName(name: string): string {
    return name?.split(' ')?.[0] || '';
  }
}
