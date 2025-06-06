import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserDecorator = createParamDecorator<undefined>(
  (_data, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    return request.user as {
      id: string;
      user_type: string;
      current_selected_business_slug?: string;
    };
  },
);
