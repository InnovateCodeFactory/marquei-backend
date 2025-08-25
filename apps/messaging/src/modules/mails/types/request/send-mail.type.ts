export interface SendMailOptions {
  to: string | string[]; // destinatário(s)
  subject: string;
  html: string; // corpo HTML
  from: string;
}
