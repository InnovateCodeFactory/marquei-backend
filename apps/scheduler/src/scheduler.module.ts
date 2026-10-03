import { LibsSharedModule } from '@app/shared';
import { Global, Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';

// RedisLockService agora vem do LibsSharedModule (global).
@Global()
@Module({
  imports: [LibsSharedModule, ApplicationModule],
})
export class SchedulerModule {}
