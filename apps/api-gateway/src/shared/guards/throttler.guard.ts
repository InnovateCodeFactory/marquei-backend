import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class SafeThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext) {
    if (context.getType && context.getType() !== 'http') {
      return true;
    }
    return super.canActivate(context);
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    if (!res || typeof res.header !== 'function') {
      return { req: req ?? { headers: {} }, res: { header: () => undefined } };
    }

    return { req, res };
  }
}
