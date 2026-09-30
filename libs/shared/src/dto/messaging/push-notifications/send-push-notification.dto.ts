export class SendPushNotificationDto {
  pushTokens: string[];
  title: string;
  body: string;
  /** Payload opcional entregue ao app (ex.: deep link ao tocar na notificação). */
  data?: Record<string, unknown>;

  constructor(obj: SendPushNotificationDto) {
    Object.assign(this, obj);
  }
}
