export class SendWelcomeMailDto {
  firstName: string;
  to: string;

  constructor(obj: SendWelcomeMailDto) {
    Object.assign(this, obj);
  }
}
