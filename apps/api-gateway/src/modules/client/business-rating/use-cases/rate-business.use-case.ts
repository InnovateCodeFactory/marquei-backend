import { PrismaService } from '@app/shared';
import { SendInAppNotificationDto } from '@app/shared/dto/messaging/in-app-notifications';
import { SendPushNotificationDto } from '@app/shared/dto/messaging/push-notifications';
import { MESSAGING_QUEUES } from '@app/shared/modules/rmq/constants';
import { RmqService } from '@app/shared/modules/rmq/rmq.service';
import { AppRequest } from '@app/shared/types/app-request';
import { getTwoNames } from '@app/shared/utils';
import { NotificationMessageBuilder } from '@app/shared/utils/notification-message-builder';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { RateBusinessDto } from '../dto/rate-business.dto';

@Injectable()
export class RateBusinessUseCase {
  private readonly logger = new Logger(RateBusinessUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rmqService: RmqService,
  ) {}

  async execute(dto: RateBusinessDto, req: AppRequest) {
    // validação básica do score
    if (dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('Score deve estar entre 1 e 5.');
    }

    const userAlreadyRated = await this.prisma.businessRating.findFirst({
      where: { business_slug: dto.business_slug, userId: req.user.id },
      select: { id: true },
    });
    if (userAlreadyRated) {
      throw new BadRequestException('Você já avaliou este estabelecimento.');
    }

    await this.prisma.$transaction(async (tx) => {
      // cria a avaliação
      await tx.businessRating.create({
        data: {
          business: { connect: { slug: dto.business_slug } },
          user: { connect: { id: req.user.id } },
          rating: dto.score,
          review: dto.comment ?? null,
        },
      });

      // Atualiza contadores por estrela + reviews_count
      // e recalcula a média ponderada usando os valores JÁ incrementados
      await tx.$executeRawUnsafe(
        `
        UPDATE "Business"
        SET
          reviews_count    = reviews_count + 1,
          total_one_star   = total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END,
          total_two_star   = total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END,
          total_three_star = total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END,
          total_four_star  = total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END,
          total_five_star  = total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END,
          rating = (
            ((total_one_star   + CASE WHEN $1 = 1 THEN 1 ELSE 0 END) * 1) +
            ((total_two_star   + CASE WHEN $1 = 2 THEN 1 ELSE 0 END) * 2) +
            ((total_three_star + CASE WHEN $1 = 3 THEN 1 ELSE 0 END) * 3) +
            ((total_four_star  + CASE WHEN $1 = 4 THEN 1 ELSE 0 END) * 4) +
            ((total_five_star  + CASE WHEN $1 = 5 THEN 1 ELSE 0 END) * 5)
          )::float / (reviews_count + 1)
        WHERE slug = $2
        `,
        dto.score,
        dto.business_slug,
      );
    });

    const trimmedComment = dto.comment?.trim();
    if (!trimmedComment) return null;

    const [business, reviewer] = await Promise.all([
      this.prisma.business.findUnique({
        where: { slug: dto.business_slug },
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { id: true, push_token: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true },
      }),
    ]);

    if (!business) return null;
    if (business.ownerId === req.user.id) return null;

    const ownerProfessionalProfile =
      await this.prisma.professionalProfile.findFirst({
        where: {
          business_id: business.id,
          userId: business.ownerId,
        },
        select: { id: true },
      });

    if (!ownerProfessionalProfile) {
      this.logger.warn(
        `Owner sem ProfessionalProfile para receber in-app notification (businessId=${business.id}, ownerId=${business.ownerId}).`,
      );
      return null;
    }

    const titleAndBody =
      NotificationMessageBuilder.buildBusinessRatedWithCommentMessage({
        reviewer_name: getTwoNames(reviewer?.name ?? 'Um cliente'),
        business_name: business.name,
        rating: dto.score,
        comment: trimmedComment,
      });

    const pushTokens = business.owner.push_token
      ? [business.owner.push_token]
      : [];

    await Promise.all([
      this.rmqService.publishToQueue({
        payload: new SendPushNotificationDto({
          pushTokens,
          title: titleAndBody.title,
          body: titleAndBody.body,
        }),
        routingKey: MESSAGING_QUEUES.PUSH_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      }),
      this.rmqService.publishToQueue({
        payload: new SendInAppNotificationDto({
          title: titleAndBody.title,
          body: titleAndBody.body,
          professionalProfileId: ownerProfessionalProfile.id,
        }),
        routingKey:
          MESSAGING_QUEUES.IN_APP_NOTIFICATIONS.SEND_NOTIFICATION_QUEUE,
      }),
    ]);

    return null;
  }
}
