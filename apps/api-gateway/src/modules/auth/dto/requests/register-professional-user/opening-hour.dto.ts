import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { TimeRangeDto } from './time-range.dto'; // importa o TimeRangeDto

export class OpeningHourDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeRangeDto)
  @ApiProperty({ type: [TimeRangeDto] })
  times: TimeRangeDto[];

  @IsBoolean()
  @ApiProperty({ example: false })
  closed: boolean;
}
