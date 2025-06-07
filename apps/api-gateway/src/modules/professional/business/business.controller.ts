import { ResponseHandlerService } from '@app/shared/services';
import { Controller } from '@nestjs/common';

@Controller('professional/business')
export class BusinessController {
  constructor(private readonly responseHandler: ResponseHandlerService) {}
}
