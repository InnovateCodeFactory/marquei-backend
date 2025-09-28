import { LibsSharedModule } from '@app/shared';
import { Global, Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';
import { RedisLockService } from './infrastructure/locks/redis-lock.service';

@Global()
@Module({
  imports: [LibsSharedModule, ApplicationModule],
  providers: [RedisLockService],
  exports: [RedisLockService],
})
export class SchedulerModule {}
