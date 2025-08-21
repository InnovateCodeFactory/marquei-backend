import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentCustomerDecorator = createParamDecorator<undefined>(
  (_data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    return request.user;
  },
);
