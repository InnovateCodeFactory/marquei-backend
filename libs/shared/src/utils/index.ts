import { TZDate } from '@date-fns/tz';
import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { formatDate as formatDateFns, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Request } from 'express';
import { AppRequest } from '../types/app-request';

export function getClientIp(req: Request | AppRequest): string | undefined {
  const cfIp = req.headers['cf-connecting-ip'];

  const xff = req.headers['x-forwarded-for'];
  const xffValue = Array.isArray(xff) ? xff[0] : xff;

  const remoteAddr = req.socket?.remoteAddress;

  return (
    (typeof cfIp === 'string' ? cfIp : undefined) ||
    (typeof xffValue === 'string'
      ? xffValue.split(',')[0].trim()
      : undefined) ||
    remoteAddr
  );
}

export function removeSpecialCharacters(value: string): string {
  return value?.replace(/[^\w\s]/gi, '');
}

export function removeWhitespaces(value: string): string {
  return value?.replace(/\s+/g, '');
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
