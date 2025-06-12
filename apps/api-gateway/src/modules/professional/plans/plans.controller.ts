import { ResponseHandlerService } from '@app/shared/services';
import { Controller } from '@nestjs/common';

@Controller('plans')
export class PlansController {
  constructor(private readonly responseHandler: ResponseHandlerService) {}
}
