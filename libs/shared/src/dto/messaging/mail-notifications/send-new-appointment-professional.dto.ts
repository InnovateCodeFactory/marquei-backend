export class SendNewAppointmentProfessionalDto {
  professionalName: string;
  clientName: string;
  serviceName: string;
  apptDate: string;
  apptTime: string;
  price: string;
  clientNotes: string;
  to: string;
  duration: string;

  constructor(obj: SendNewAppointmentProfessionalDto) {
    Object.assign(this, obj);
  }
}
