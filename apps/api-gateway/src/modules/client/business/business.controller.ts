import { ResponseHandlerService } from '@app/shared/services';
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('client/business')
@ApiTags('Business (Client)')
export class BusinessController {
  constructor(private readonly responseHandler: ResponseHandlerService) {}
}
