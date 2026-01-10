import { TZDate } from '@date-fns/tz';
import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { formatDate as formatDateFns, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Request } from 'express';
import { AppRequest } from '../types/app-request';

export function getClientIp(
  req?: Request | AppRequest | null,
): string | undefined {
  if (!req?.headers) return undefined;

  const cfIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];
  const xClientIp = req.headers['x-client-ip'];
  const trueClientIp = req.headers['true-client-ip'];
  const fastlyIp = req.headers['fastly-client-ip'];

  const xff = req.headers['x-forwarded-for'];
  const xffValue = Array.isArray(xff) ? xff[0] : xff;

  const remoteAddr = req.socket?.remoteAddress;
  const reqIp = (req as any).ip as string | undefined;

  const normalize = (ip?: string) =>
    ip ? ip.replace(/^::ffff:/, '').trim() : undefined;
  const isPrivateIp = (ip: string) => {
    if (ip === '::1' || ip === '127.0.0.1') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
    if (ip.startsWith('fe80:')) return true; // IPv6 link-local
    return false;
  };

  const pickFromList = (value?: string) => {
    if (!value) return undefined;
    const ips = value
      .split(',')
      .map((item) => normalize(item))
      .filter(Boolean) as string[];
    if (!ips.length) return undefined;
    return ips.find((ip) => !isPrivateIp(ip)) ?? ips[0];
  };

  return (
    (typeof xClientIp === 'string' ? normalize(xClientIp) : undefined) ||
    (typeof trueClientIp === 'string' ? normalize(trueClientIp) : undefined) ||
    (typeof cfIp === 'string' ? cfIp : undefined) ||
    (typeof xRealIp === 'string' ? normalize(xRealIp) : undefined) ||
    (typeof fastlyIp === 'string' ? normalize(fastlyIp) : undefined) ||
    (typeof xffValue === 'string' ? pickFromList(xffValue) : undefined) ||
    (reqIp ? normalize(reqIp) : undefined) ||
    (remoteAddr ? normalize(remoteAddr) : undefined)
  );
}

export function removeSpecialCharacters(value: string): string {
  return value?.replace(/[^\w\s]/gi, '');
}

export function removeWhitespaces(value: string): string {
  return value?.replace(/\s+/g, '');
}

export function slugifyBusinessName(name: string): string {
  return name
    .normalize('NFD') // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // troca nao alfanumerico por hifen
    .replace(/^-|-$/g, ''); // remove hifen no comeco/fim
}

export function normalizeAmenityIcon(icon: string): string {
  const map: Record<string, string> = {
    female: 'gender-female',
    male: 'gender-male',
    money: 'cash',
    'badge-check': 'certificate',
  };

  if (!icon) return icon;
  return map[icon] ?? icon;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

export function getInitials(name: string): string {
  const names = name.split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  return names
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

export function formatDate(date: Date, format?: string): string {
  return formatDateFns(date, format || 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTimeWithWeekday(date: Date): string {
  const weekday = formatDateFns(date, 'EEEE', { locale: ptBR });
  const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dayMonth = formatDateFns(date, 'dd/MM', { locale: ptBR });
  const time = formatDateFns(date, 'HH:mm', { locale: ptBR });
  return `${weekdayCapitalized}, ${dayMonth} às ${time}`;
}

export function formatDateDistanceToNow(date: Date): string {
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
}

export function generateRandomString(length: number): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function formatPhoneNumber(value: string) {
  if (!value) return '';

  // remove tudo que não é número
  let cleaned = value.replace(/\D/g, '');

  // remove prefixo 55 se tiver sobrado
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.slice(2);
  }

  // celular (11 dígitos: DDD + 9 + número)
  if (cleaned.length === 11) {
    const ddd = cleaned.slice(0, 2);
    const p1 = cleaned.slice(2, 7);
    const p2 = cleaned.slice(7);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // fixo (10 dígitos: DDD + número)
  if (cleaned.length === 10) {
    const ddd = cleaned.slice(0, 2);
    const p1 = cleaned.slice(2, 6);
    const p2 = cleaned.slice(6);
    return `+55 (${ddd}) ${p1}-${p2}`;
  }

  // fallback — se não for 10 ou 11 dígitos
  return `+55 ${cleaned}`;
}

export function formatAppointmentStatus(status: string): string {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return 'Confirmado';
    case AppointmentStatus.CANCELED:
      return 'Cancelado';
    case AppointmentStatus.COMPLETED:
      return 'Concluído';
    case AppointmentStatus.PENDING:
      return 'Pendente';
    default:
      return 'Desconhecido';
  }
}

export function formatDuration(
  durationInMinutes: number,
  formattingStyle: 'short' | 'medium' = 'short',
): string {
  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const hoursLabel = 'h';
  const minutesLabel = formattingStyle === 'short' ? 'm' : 'min';

  if (hours > 0) return `${hours}${hoursLabel} ${minutes}${minutesLabel}`;

  return `${minutes}${minutesLabel}`;
}

export function getTwoNames(name: string): string {
  if (!name) return '';

  const names = name?.split(' ');
  if (names.length === 1) return names[0];
  return `${names[0]} ${names[1]}`;
}

export function codeGenerator({
  length,
  onlyNumbers = false,
  onlyLetters = false,
}: {
  length: number;
  onlyNumbers?: boolean;
  onlyLetters?: boolean;
}): string {
  let result = '';
  const characters =
    !onlyNumbers && !onlyLetters
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      : onlyNumbers
        ? '0123456789'
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export function getFirstName(name: string): string {
  const names = name.split(' ');
  return names.length > 0 ? names?.[0] : '';
}

export const buildAddress = (r: {
  street: string | null;
  number: string | null;
  neighbourhood: string | null;
  city: string | null;
  uf: string | null;
  complement: string | null;
}) => {
  const line1 = [r.street, r.number].filter(Boolean).join(', ');
  const line2 = [r.neighbourhood, r.city, r.uf].filter(Boolean).join(' - ');
  const comp = r.complement ? ` (${r.complement})` : '';
  return [line1, line2].filter(Boolean).join(' • ') + comp;
};

export function formatDurationToHoursAndMinutes(duration: number) {
  const durationHours = Math.floor(duration / 60);
  const durationMinutes = duration % 60;

  return durationHours > 0
    ? `${durationHours}h ${durationMinutes}min`
    : `${durationMinutes}min`;
}

export function parseYmdToTZDate({
  ymd,
  tzId,
}: {
  ymd: string;
  tzId: string;
}): TZDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new BadRequestException('Data inválida, use yyyy-MM-dd');
  const [, y, mo, d] = m.map(Number) as unknown as number[];
  return new TZDate(y, mo - 1, d, 0, 0, 0, tzId);
}

export function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;

  const part1 = cleaned.slice(0, 3);
  const part2 = cleaned.slice(3, 6);
  const part3 = cleaned.slice(6, 9);
  const part4 = cleaned.slice(9, 11);

  return `${part1}.${part2}.${part3}-${part4}`;
}
