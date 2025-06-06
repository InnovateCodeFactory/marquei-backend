import { Request } from 'express';
import { CurrentUser } from './current-user.types';

export * from './current-user.types';
export type AppRequest = Request & {
  user: CurrentUser;
};
