import { IsBoolean } from 'class-validator';

export class InnovateConnectToggleAppUpdateModalDto {
  @IsBoolean()
  is_active: boolean;
}

