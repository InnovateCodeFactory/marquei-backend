import { Injectable, Logger } from '@nestjs/common';
import {
  Expo,
  ExpoPushErrorTicket,
  ExpoPushMessage,
  ExpoPushReceipt,
  ExpoPushTicket,
} from 'expo-server-sdk';
import {
  PushInput,
  PushSendOptions,
  PushSendReport,
} from './types/push-notifications.types';

@Injectable()
export class PushNotificationsBaseService {
  private readonly logger = new Logger();
  private expo = new Expo();

  constructor() {
    this.logger.debug('PushNotificationsBaseService initialized');
  }

  async sendPushNotification({
    input,
    options = { fetchReceipts: true },
  }: {
    input: PushInput;
    options: PushSendOptions;
  }): Promise<PushSendReport> {
    const verbose = !!options.verbose;
    const dryRun = !!options.dryRun;
    const fetchReceipts = options.fetchReceipts !== false;

    const tokens = Array.isArray(input.to) ? input.to : [input.to];
    const { messages, invalidTokens } = this.buildMessages(input, tokens);

    if (verbose) {
      this.logger.debug(
        `Montadas ${messages.length} mensagens. Tokens inválidos: ${invalidTokens.length}`,
      );
    }

    if (dryRun) {
      return {
        requested: tokens.length,
        enqueued: 0,
        invalidTokens,
        tickets: [],
        receiptIds: [],
        failedTickets: [],
        failedReceipts: [],
      };
    }

    const { tickets, failedTickets } = await this.sendInChunks(
      messages,
      verbose,
    );

    const receiptIds = tickets
      .filter((t) => t.status === 'ok' && !!(t as any).id)
      .map((t) => (t as any).id as string);

    let receipts: Record<string, ExpoPushReceipt> | undefined;
    let failedReceipts: { receiptId: string; receipt: ExpoPushReceipt }[] = [];

    if (fetchReceipts && receiptIds.length > 0) {
      const res = await this.fetchReceiptsInChunks(receiptIds, verbose);
      receipts = res.receipts;
      failedReceipts = res.failedReceipts;
    }

    return {
      requested: tokens.length,
      enqueued: tickets.filter((t) => t.status === 'ok').length,
      invalidTokens,
      tickets,
      receiptIds,
      receipts,
      failedTickets,
      failedReceipts,
    };
  }

  // ---------- Helpers principais ----------

  /** Constrói mensagens por token e valida tokens */
  private buildMessages(
    input: PushInput,
    tokens: string[],
  ): { messages: ExpoPushMessage[]; invalidTokens: string[] } {
    const invalidTokens: string[] = [];

    // Campos comuns (qualquer campo de ExpoPushMessage exceto 'to')
    const { to: _omit, ...common } = input as Omit<ExpoPushMessage, 'to'> & {
      to?: any;
    };

    const messages: ExpoPushMessage[] = tokens
      .map((token) => {
        if (!Expo.isExpoPushToken(token)) {
          invalidTokens.push(token);
          return null;
        }
        // você pode personalizar por token aqui se quiser
        const msg: ExpoPushMessage = {
          to: token,
          ...common,

          // Valores padrão recomendáveis (ajuste conforme seu app)
          sound: (common as any).sound ?? 'default',
          priority: (common as any).priority ?? 'default', // 'default' | 'normal' | 'high'
          // ttl: 60 * 60, // 1h, se quiser
          // channelId: 'default', // Android: deve existir no app
        };

        return msg;
      })
      .filter(Boolean) as ExpoPushMessage[];

    return { messages, invalidTokens };
  }

  /** Envia em chunks e coleta tickets */
  private async sendInChunks(
    messages: ExpoPushMessage[],
    verbose = false,
  ): Promise<{
    tickets: ExpoPushTicket[];
    failedTickets: {
      token?: string;
      message?: ExpoPushMessage;
      ticket: ExpoPushTicket;
      errorCode?: string;
      errorDetail?: ExpoPushErrorTicket['details']['error'];
    }[];
  }> {
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    const failedTickets: {
      token?: string;
      message?: ExpoPushMessage;
      ticket: ExpoPushTicket;
      errorCode?: string;
      errorDetail?: ExpoPushErrorTicket['details']['error'];
    }[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // vincula ticket à mensagem respectiva pelo índice do chunk
        ticketChunk.forEach((ticket, idx) => {
          if (ticket.status === 'error') {
            const msg = chunk[idx];
            const errorDetail = (
              ticket.details as ExpoPushErrorTicket['details'] | undefined
            )?.error;
            failedTickets.push({
              token: Array.isArray(msg.to) ? msg.to[0] : msg.to,
              message: msg,
              ticket,
              errorCode: errorDetail,
              errorDetail,
            });

            if (verbose) {
              this.logger.warn(
                `[TICKET ERROR] token=${msg.to} code=${errorDetail ?? 'unknown'} message=${ticket.message}`,
              );
            }
          }
        });

        if (verbose) {
          this.logger.debug(
            `Chunk enviado. OK=${ticketChunk.filter((t) => t.status === 'ok').length} ERROR=${ticketChunk.filter((t) => t.status === 'error').length}`,
          );
        }
      } catch (err: any) {
        // erro no lote inteiro (rede, etc.)
        this.logger.error(
          `Falha ao enviar chunk: ${err?.message || err}`,
          err?.stack,
        );
        // opcional: requeue/retry do chunk inteiro
      }
    }

    return { tickets, failedTickets };
  }

  /** Faz lookup de receipts em chunks e classifica erros */
  private async fetchReceiptsInChunks(
    receiptIds: string[],
    verbose = false,
  ): Promise<{
    receipts: Record<string, ExpoPushReceipt>;
    failedReceipts: { receiptId: string; receipt: ExpoPushReceipt }[];
  }> {
    const chunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
    const receipts: Record<string, ExpoPushReceipt> = {};
    const failedReceipts: { receiptId: string; receipt: ExpoPushReceipt }[] =
      [];

    for (const chunk of chunks) {
      try {
        const res = await this.expo.getPushNotificationReceiptsAsync(chunk);
        Object.assign(receipts, res);

        for (const [receiptId, receipt] of Object.entries(res)) {
          if (receipt.status === 'error') {
            failedReceipts.push({ receiptId, receipt });
            const code = (receipt.details as any)?.error as string | undefined;

            if (verbose) {
              this.logger.warn(
                `[RECEIPT ERROR] id=${receiptId} code=${code ?? 'unknown'} message=${receipt.message}`,
              );
            }

            // Sugestões de ações por código comum:
            // - 'DeviceNotRegistered' => remover token do banco
            // - 'MessageRateExceeded' => retry com backoff
            // - 'MessageTooBig' => reduzir payload / rich content
            // - 'InvalidCredentials' => checar FCM/APNs
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Falha ao obter receipts: ${err?.message || err}`,
          err?.stack,
        );
      }
    }

    return { receipts, failedReceipts };
  }

  // ---------- APIs convenientes de alto nível ----------

  /** Envia para múltiplos tokens com um payload comum */
  async sendToMultipleTokens({
    common,
    tokens,
    options,
  }: {
    tokens: string[];
    common: Omit<ExpoPushMessage, 'to'>;
    options?: PushSendOptions;
  }) {
    return this.sendPushNotification({
      input: { ...common, to: tokens },
      options,
    });
  }

  /** Envia para um único token */
  async sendToSingleToken({
    common,
    token,
    options,
  }: {
    token: string;
    common: Omit<ExpoPushMessage, 'to'>;
    options?: PushSendOptions;
  }) {
    return this.sendPushNotification({
      input: { ...common, to: token },
      options,
    });
  }
}
