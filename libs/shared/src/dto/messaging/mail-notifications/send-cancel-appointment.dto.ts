export class SendCancelAppointmentMailDto {
  toName: string;
  byName: string;
  byTypeLabel: 'profissional' | 'cliente';
  serviceName: string;
  apptDate: string;
  apptTime: string;
  price: string;
  to: string;
  duration: string;

  constructor(obj: SendCancelAppointmentMailDto) {
    Object.assign(this, obj);
  }
}
