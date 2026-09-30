import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { EnvSchemaType, envValidationSchema } from './environment';
import { DatabaseModule } from './modules/database/database.module';
import { GoogleCalendarModule } from './modules/google-calendar/google-calendar.module';
import { RedisModule } from './modules/redis/redis.module';
import { RmqModule } from './modules/rmq/rmq.module';
import {
  AppointmentEventsStreamService,
  CustomerPlanCreditService,
  CustomerPlanSummaryService,
  EncryptionService,
  FileSystemService,
  HashingService,
  RecurringAppointmentsService,
  RedisLockService,
  ResponseHandlerService,
  TokenService,
  TypedConfigService,
  WaitlistEventsService,
  WaitlistHoldService,
} from './services';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvSchemaType>) => ({
        global: true,
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    GoogleCalendarModule,
    RmqModule,
    RedisModule,
  ],
  providers: [
    ResponseHandlerService,
    TypedConfigService,
    HashingService,
    FileSystemService,
    TokenService,
    EncryptionService,
    AppointmentEventsStreamService,
    CustomerPlanCreditService,
    CustomerPlanSummaryService,
    RecurringAppointmentsService,
    RedisLockService,
    WaitlistEventsService,
    WaitlistHoldService,
  ],
  exports: [
    ConfigModule,
    DatabaseModule,
    RmqModule,
    RedisModule,
    ResponseHandlerService,
    TypedConfigService,
    HashingService,
    JwtModule,
    FileSystemService,
    TokenService,
    EncryptionService,
    AppointmentEventsStreamService,
    CustomerPlanCreditService,
    CustomerPlanSummaryService,
    RecurringAppointmentsService,
    RedisLockService,
    WaitlistEventsService,
    WaitlistHoldService,
    ScheduleModule,
    GoogleCalendarModule,
  ],
})
export class LibsSharedModule {}
