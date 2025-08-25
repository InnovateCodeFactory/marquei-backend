import { AppointmentStatus } from '@prisma/client';
import { formatDate as formatDateFns, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function removeSpecialCharacters(value: string): string {
  return value?.replace(/[^\w\s]/gi, '');
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
  const cleanedValue = value?.replace(/\D/g, '');

  if (cleanedValue?.length > 10)
    return cleanedValue
      ?.replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{4})/, '$1-$2');

  return cleanedValue
    ?.replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d{4})/, '$1-$2');
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
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      : onlyNumbers
        ? '0123456789'
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
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
