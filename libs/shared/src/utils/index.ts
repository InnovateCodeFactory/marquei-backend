import { formatDate as formatDateFns } from 'date-fns';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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
  return formatDateFns(date, format || 'dd/MM/yyyy');
}
