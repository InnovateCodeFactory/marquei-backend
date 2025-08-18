export class SendPushNotificationDto {
  pushTokens: string[];
  title: string;
  body: string;

  constructor(obj: SendPushNotificationDto) {
    Object.assign(this, obj);
  }
}
