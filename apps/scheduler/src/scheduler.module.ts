import { LibsSharedModule } from '@app/shared';
import { Module } from '@nestjs/common';
import { ApplicationModule } from './application/application.module';
import { RedisLockService } from './infrastructure/locks/redis-lock.service';

@Module({
  imports: [LibsSharedModule, ApplicationModule],
  providers: [RedisLockService],
  exports: [RedisLockService],
})
export class SchedulerModule {}
