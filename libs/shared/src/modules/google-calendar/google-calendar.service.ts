import { EnvSchemaType } from '@app/shared/environment';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import * as path from 'node:path';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Nome padrão do arquivo de credenciais, igual ao que está na raiz do backend
const DEFAULT_CREDENTIALS_FILENAME =
  'client_secret_324221970568-q1aka42rlqpupbtj4sjm0gu6peupmnd5.apps.googleusercontent.com.json';

const DEFAULT_CREDENTIALS_PATH = path.join(
  process.cwd(),
  DEFAULT_CREDENTIALS_FILENAME,
);

export type GoogleOAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
  id_token?: string | null;
  [key: string]: any;
};

type ListEventsParams = {
  tokens: GoogleOAuthTokens;
  calendarId?: string;
  timeMin?: string | Date;
  timeMax?: string | Date;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
};

type GetEventParams = {
  tokens: GoogleOAuthTokens;
  calendarId?: string;
  eventId: string;
};

type MutateEventBase = {
  tokens: GoogleOAuthTokens;
  calendarId?: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
};

type CreateEventParams = MutateEventBase & {
  event: calendar_v3.Schema$Event;
};

type UpdateEventParams = MutateEventBase & {
  eventId: string;
  event: calendar_v3.Schema$Event;
};

type DeleteEventParams = MutateEventBase & {
  eventId: string;
};

type GenerateAuthUrlParams = {
  scope?: string[];
  state?: string;
  accessType?: 'online' | 'offline';
  includeGrantedScopes?: boolean;
  prompt?: 'consent' | 'select_account' | string;
};

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService<EnvSchemaType>,
  ) {
    this.clientId = this.configService.getOrThrow('GOOGLE_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow(
      'GOOGLE_CALENDAR_REDIRECT_URI',
    );
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );
  }

  private createCalendarClient(tokens: GoogleOAuthTokens) {
    const oAuth2Client = this.createOAuthClient();
    oAuth2Client.setCredentials(tokens);

    return google.calendar({
      version: 'v3',
      auth: oAuth2Client,
    });
  }

  /**
   * Autenticação "local" usando o arquivo JSON de credenciais
   * (mesmo padrão do exemplo oficial do Google).
   *
   * Útil para rodar jobs/scheduler que só precisam acessar o calendário
   * de uma conta específica configurada no JSON.
   */
  private async createCalendarClientFromLocalCredentials(options?: {
    scopes?: string[];
    credentialsPath?: string;
  }) {
    const scopes = options?.scopes ?? DEFAULT_SCOPES;
    const keyfilePath = options?.credentialsPath ?? DEFAULT_CREDENTIALS_PATH;

    const auth = await authenticate({
      scopes,
      keyfilePath,
    });

    return google.calendar({
      version: 'v3',
      auth: auth as any,
    });
  }

  /**
   * Gera a URL de consentimento para o usuário conectar o Google Calendar.
   */
  generateAuthUrl(params?: GenerateAuthUrlParams): string {
    const client = this.createOAuthClient();

    return client.generateAuthUrl({
      access_type: params?.accessType ?? 'offline',
      scope: params?.scope ?? DEFAULT_SCOPES,
      state: params?.state,
      include_granted_scopes: params?.includeGrantedScopes ?? true,
      prompt: params?.prompt ?? 'consent',
    });
  }

  /**
   * Troca o "code" recebido no redirect pelos tokens OAuth (access/refresh).
   * Você deve persistir esses tokens associado ao usuário/profissional.
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);

    this.logger.debug('Google OAuth tokens obtidos com sucesso');

    return tokens;
  }

  /**
   * Atualiza o access token usando o refresh token salvo.
   * Retorna o conjunto de credenciais atualizadas que devem ser persistidas.
   */
  async refreshAccessToken(
    tokens: GoogleOAuthTokens,
  ): Promise<GoogleOAuthTokens> {
    const client = this.createOAuthClient();
    client.setCredentials(tokens);

    const { credentials } = await client.refreshAccessToken();

    this.logger.debug('Google OAuth tokens atualizados com sucesso');

    return credentials;
  }

  /**
   * Revoga os tokens OAuth do Google para desconectar a integração.
   */
  async revokeTokens(tokens: GoogleOAuthTokens): Promise<void> {
    const client = this.createOAuthClient();
    const tokenToRevoke = tokens.refresh_token ?? tokens.access_token;
    if (!tokenToRevoke) {
      return;
    }

    try {
      await client.revokeToken(tokenToRevoke);
      this.logger.debug('Google OAuth tokens revogados com sucesso');
    } catch (error) {
      this.logger.warn('Falha ao revogar tokens do Google', error as any);
    }
  }

  /**
   * Exemplo direto baseado no código do Google:
   * lista os próximos eventos usando o arquivo de credenciais local.
   *
   * Pode ser usado, por exemplo, em um job do scheduler.
   */
  async listEventsFromLocalCredentials(params?: {
    calendarId?: string;
    timeMin?: string | Date;
    timeMax?: string | Date;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    scopes?: string[];
    credentialsPath?: string;
  }): Promise<calendar_v3.Schema$Event[]> {
    const calendar = await this.createCalendarClientFromLocalCredentials({
      scopes: params?.scopes,
      credentialsPath: params?.credentialsPath,
    });

    const {
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults = 10,
      singleEvents = true,
      orderBy = 'startTime',
    } = params ?? {};

    const result = await calendar.events.list({
      calendarId,
      timeMin: timeMin ? new Date(timeMin).toISOString() : undefined,
      timeMax: timeMax ? new Date(timeMax).toISOString() : undefined,
      maxResults,
      singleEvents,
      orderBy,
    });

    return result.data.items ?? [];
  }

  /**
   * Lista eventos de um calendário entre timeMin e timeMax.
   */
  async listEvents(params: ListEventsParams): Promise<calendar_v3.Schema$Event[]> {
    const {
      tokens,
      calendarId = 'primary',
      timeMin,
      timeMax,
      maxResults = 250,
      singleEvents = true,
      orderBy = 'startTime',
    } = params;

    const calendar = this.createCalendarClient(tokens);

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin ? new Date(timeMin).toISOString() : undefined,
      timeMax: timeMax ? new Date(timeMax).toISOString() : undefined,
      maxResults,
      singleEvents,
      orderBy,
    });

    return response.data.items ?? [];
  }

  /**
   * Obtém um evento específico.
   */
  async getEvent(
    params: GetEventParams,
  ): Promise<calendar_v3.Schema$Event | null> {
    const { tokens, calendarId = 'primary', eventId } = params;

    const calendar = this.createCalendarClient(tokens);
    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data ?? null;
  }

  /**
   * Cria um evento no calendário.
   */
  async createEvent(
    params: CreateEventParams,
  ): Promise<calendar_v3.Schema$Event> {
    const {
      tokens,
      calendarId = 'primary',
      event,
      sendUpdates = 'all',
    } = params;

    const calendar = this.createCalendarClient(tokens);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates,
    });

    return response.data;
  }

  /**
   * Atualiza (patch) um evento existente.
   */
  async updateEvent(
    params: UpdateEventParams,
  ): Promise<calendar_v3.Schema$Event> {
    const {
      tokens,
      calendarId = 'primary',
      eventId,
      event,
      sendUpdates = 'all',
    } = params;

    const calendar = this.createCalendarClient(tokens);

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: event,
      sendUpdates,
    });

    return response.data;
  }

  /**
   * Remove um evento do calendário.
   */
  async deleteEvent(params: DeleteEventParams): Promise<void> {
    const {
      tokens,
      calendarId = 'primary',
      eventId,
      sendUpdates = 'all',
    } = params;

    const calendar = this.createCalendarClient(tokens);

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates,
    });
  }
}
