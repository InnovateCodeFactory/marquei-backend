export interface SendMailResponse {
  accepted: string[];
  rejected: string[];
  ehlo: string[];
  envelopeTime: number;
  messageTime: number;
  messageSize: number;
  envelope: {
    from: string;
    to: string[];
  };
  response: string;
  messageId: string;
}
