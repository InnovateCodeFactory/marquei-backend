import { ResponseHandlerService } from '@app/shared/services';
import { Controller } from '@nestjs/common';

@Controller('business')
export class BusinessController {
  constructor(private readonly responseHandler: ResponseHandlerService) {}
}
