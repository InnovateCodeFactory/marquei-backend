import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWebSsoLinkDto {
  @ApiPropertyOptional({
    description:
      'URL absoluta de retorno após autenticar no web. Precisa estar em WEB_APP_ORIGINS.',
    example: 'https://sistema.marquei.app.br/agenda',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  return_to?: string;
}
