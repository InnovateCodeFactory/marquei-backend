import { ConfigService } from '@nestjs/config';
import { GoogleCalendarService } from './google-calendar.service';

const config = {
  getOrThrow: (key: string) =>
    ({
      GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_CALENDAR_REDIRECT_URI: 'https://example.com/callback',
    })[key],
} as unknown as ConfigService<any>;

describe('GoogleCalendarService (@googleapis/calendar)', () => {
  const service = new GoogleCalendarService(config);

  it('gera a URL de consentimento com os parametros do OAuth', () => {
    const url = new URL(service.generateAuthUrl({ state: 'abc' }));

    expect(url.origin + url.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(url.searchParams.get('client_id')).toBe(
      'client-id.apps.googleusercontent.com',
    );
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/callback',
    );
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar',
    );
    expect(url.searchParams.get('state')).toBe('abc');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('cria o cliente do Calendar v3 com os metodos de eventos usados pelo servico', () => {
    const client = (service as any).createCalendarClient({
      access_token: 'token',
    });

    for (const method of ['list', 'get', 'insert', 'patch', 'delete']) {
      expect(typeof client.events[method]).toBe('function');
    }
  });

  it('revokeTokens sem token nao chama o Google', async () => {
    await expect(service.revokeTokens({})).resolves.toBeUndefined();
  });
});
