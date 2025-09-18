import { BusinessPublicTypeEnum } from '@app/shared/enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class EditPreferredContentDto {
  @IsNotEmpty()
  @ApiProperty({
    enum: BusinessPublicTypeEnum,
    example: BusinessPublicTypeEnum.BOTH,
    description: 'Tipo de público atendido pelo negócio',
  })
  @IsEnum(BusinessPublicTypeEnum)
  public_type: BusinessPublicTypeEnum;
}
