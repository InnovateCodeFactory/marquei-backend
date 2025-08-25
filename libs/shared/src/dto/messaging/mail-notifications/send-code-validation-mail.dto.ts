export class SendCodeValidationMailDto {
  to: string;

  constructor(obj: SendCodeValidationMailDto) {
    Object.assign(this, obj);
  }
}
