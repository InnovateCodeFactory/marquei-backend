import { PrismaService } from '@app/shared';
import { SendValidationTokenDto } from '@app/shared/dto/messaging/whatsapp-notifications/send-validation-token.dto';
import { SendWhatsAppTypeEnum, UserTypeEnum } from '@app/shared/enum';
import { RedisService } from '@app/shared/modules/redis/redis.service';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { HashingService } from '@app/shared/services';
import { AppRequest } from '@app/shared/types/app-request';
import { generateRandomString } from '@app/shared/utils';
import { CachedKeys } from '@app/shared/utils/cached-keys';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdatePasswordDto } from '../dto/requests/update-password.dto';

@Injectable()
export class UpdatePasswordUseCase {
  constructor(
    private readonly rmqService: RmqService,
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
    private readonly redisService: RedisService,
  ) {}

  async execute(dto: UpdatePasswordDto, req: AppRequest) {
    const { current_password, new_password } = dto;

    const professional = await this.prismaService.professionalProfile.findFirst(
      {
        where: {
          userId: req.user.id,
        },
        select: {
          phone: true,
          User: {
            select: {
              password: true,
            },
          },
        },
      },
    );

    if (!professional) throw new NotFoundException('Usuário não encontrado');

    if (
      !(await this.hashingService.compare(
        current_password,
        professional?.User.password,
      ))
    )
      throw new NotFoundException('Senha atual incorreta');

    const request_id = generateRandomString(16);

    const hashedPassword = await this.hashingService.hash(new_password);

    await this.redisService.set({
      key: CachedKeys.PROFESSIONAL_PASSWORD_UPDATE({
        user_id: req.user.id,
        request_id,
      }),
      value: JSON.stringify({
        user_id: req.user.id,
        new_hashed_password: hashedPassword,
      }),
      ttlInSeconds: 60 * 10, // 10 minutes
    });

    await this.rmqService.publishToQueue({
      payload: new SendValidationTokenDto({
        phone_number: professional.phone,
        user_type: UserTypeEnum.PROFESSIONAL,
        request_id,
        type: SendWhatsAppTypeEnum.PASSWORD_CHANGE,
      }),
      routingKey:
        MESSAGING_QUEUES.WHATSAPP_NOTIFICATIONS.SEND_VALIDATION_TOKEN_QUEUE,
    });

    return {
      request_id,
    };
  }
}
