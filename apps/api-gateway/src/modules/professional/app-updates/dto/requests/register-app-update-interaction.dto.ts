import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RegisterAppUpdateInteractionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'ID do modal de atualização',
    example: 'ckv123abc456',
  })
  app_update_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['viewed', 'dismissed', 'primary_clicked'])
  @ApiProperty({
    description: 'Ação realizada pelo usuário',
    example: 'primary_clicked',
  })
  action: 'viewed' | 'dismissed' | 'primary_clicked';
}
