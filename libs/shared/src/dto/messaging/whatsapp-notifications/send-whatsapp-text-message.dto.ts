export class SendWhatsAppTextMessageDto {
  phone_number: string;
  message: string;

  constructor(props: SendWhatsAppTextMessageDto) {
    Object.assign(this, props);
  }
}
