export class SendRescheduleAppointmentMailDto {
  toName: string;
  byName: string;
  byTypeLabel: 'profissional' | 'cliente';
  serviceName: string;
  apptDate: string;
  apptTime: string;
  price: string;
  to: string;
  duration: string;
  clientNotes?: string;

  constructor(obj: SendRescheduleAppointmentMailDto) {
    Object.assign(this, obj);
  }
}
