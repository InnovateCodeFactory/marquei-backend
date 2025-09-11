export class SendCancelAppointmentMailDto {
  professionalName: string;
  clientName: string;
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
