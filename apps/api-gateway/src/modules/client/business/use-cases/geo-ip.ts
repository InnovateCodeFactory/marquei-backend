import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const GEOIP_URL = 'https://reallyfreegeoip.org/json';

const UF_TO_STATE_NAME: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

const normalizeIp = (ip?: string): string | null => {
  if (!ip) return null;
  const cleaned = ip.replace('::ffff:', '').trim();
  return cleaned.length ? cleaned : null;
};

const isPrivateIp = (ip: string): boolean => {
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
};

export async function resolveStateInfoFromIp(
  http: HttpService,
  ip?: string,
): Promise<{ uf: string; name: string } | null> {
  const normalized = normalizeIp(ip);

  if (!normalized || isPrivateIp(normalized)) return null;

  try {
    const { data } = await firstValueFrom(
      http.get(`${GEOIP_URL}/${normalized}`, { timeout: 2500 }),
    );

    const country = data?.country_code;
    if (country && country !== 'BR') return null;

    const regionCode = data?.region_code;
    const uf = typeof regionCode === 'string' ? regionCode.trim() : '';
    if (uf.length !== 2) return null;
    const normalizedUf = uf.toUpperCase();
    const regionNameRaw =
      typeof data?.region_name === 'string' ? data.region_name.trim() : '';
    const name =
      regionNameRaw.length > 1
        ? regionNameRaw
        : (UF_TO_STATE_NAME[normalizedUf] ?? normalizedUf);
    return { uf: normalizedUf, name };
  } catch (err: any) {
    return null;
  }
}

export async function resolveStateFromIp(
  http: HttpService,
  ip?: string,
): Promise<string | null> {
  const info = await resolveStateInfoFromIp(http, ip);
  return info?.uf ?? null;
}
