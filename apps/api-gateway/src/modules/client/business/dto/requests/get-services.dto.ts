import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class GetServicesDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumberString()
  @IsNotEmpty()
  page: string;

  @IsNumberString()
  @IsNotEmpty()
  limit: string;
}
