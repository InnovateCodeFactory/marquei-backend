import {
  ExpoPushErrorTicket,
  ExpoPushMessage,
  ExpoPushReceipt,
  ExpoPushTicket,
} from 'expo-server-sdk';

export type PushSendReport = {
  requested: number; // quantos tokens você pediu pra enviar
  enqueued: number; // quantas notificações foram aceitas pela Expo (tickets status=ok)
  invalidTokens: string[]; // tokens descartados por formato inválido
  tickets: ExpoPushTicket[]; // todos os tickets retornados (ok + error)
  receiptIds: string[]; // ids de receipts para acompanhar status final
  receipts?: Record<string, ExpoPushReceipt>; // receipts consultados
  failedTickets: {
    token?: string;
    message?: ExpoPushMessage;
    ticket: ExpoPushTicket;
    errorCode?: string;
    errorDetail?: ExpoPushErrorTicket['details']['error'];
  }[];
  failedReceipts: {
    receiptId: string;
    receipt: ExpoPushReceipt;
  }[];
};

/** Opções altas de envio */
export type PushSendOptions = {
  /** Se true, não envia; só valida e monta mensagens. Útil pra testes. */
  dryRun?: boolean;
  /** Ativa logging detalhado */
  verbose?: boolean;
  /** Faz lookup de receipts automaticamente após envio (default true) */
  fetchReceipts?: boolean;
};

/** Payload de alto nível aceitando 1-N tokens */
export type PushInput =
  | (Omit<ExpoPushMessage, 'to'> & { to: string }) // single
  | (Omit<ExpoPushMessage, 'to'> & { to: string[] }); // multiple
