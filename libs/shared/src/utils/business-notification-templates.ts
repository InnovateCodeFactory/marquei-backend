import {
  BusinessReminderType,
  ReminderChannel,
} from '@prisma/client';

export const DEFAULT_REMINDER_MESSAGE_TEMPLATE =
  'Lembrete: você tem um agendamento de {{service_name}} com {{professional_name}} {{day_with_preposition}} às {{time}}.{{signup_hint}}{{app_download_links}}';

export const DEFAULT_CONFIRMATION_REQUEST_MESSAGE_TEMPLATE =
  '*{{business_name}}*\n\nOlá! Tudo bem? 😊\n\nO profissional {{professional_name}} solicita a confirmação do seu agendamento de *{{service_name}}* para {{day_with_preposition}}, às {{time}}.\n\n{{confirmation_action}}{{signup_hint}}';

export const BUSINESS_REMINDER_TYPES = [
  BusinessReminderType.APPOINTMENT_REMINDER,
  BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST,
] as const;

export type ReminderTypeDefaults = {
  title: string;
  description: string;
  is_active: boolean;
  channels: ReminderChannel[];
  offsets_min_before: number[];
  timezone: string;
  message_template: string;
};

export const BUSINESS_REMINDER_TYPE_DEFAULTS: Record<
  BusinessReminderType,
  ReminderTypeDefaults
> = {
  [BusinessReminderType.APPOINTMENT_REMINDER]: {
    title: 'Lembrete automático',
    description: 'Mensagem automática enviada antes do horário agendado.',
    is_active: true,
    channels: [ReminderChannel.PUSH, ReminderChannel.WHATSAPP],
    offsets_min_before: [1440, 60],
    timezone: 'America/Sao_Paulo',
    message_template: DEFAULT_REMINDER_MESSAGE_TEMPLATE,
  },
  [BusinessReminderType.APPOINTMENT_CONFIRMATION_REQUEST]: {
    title: 'Solicitação de confirmação',
    description:
      'Mensagem manual enviada quando o profissional solicita confirmação do cliente.',
    is_active: true,
    channels: [ReminderChannel.WHATSAPP],
    offsets_min_before: [],
    timezone: 'America/Sao_Paulo',
    message_template: DEFAULT_CONFIRMATION_REQUEST_MESSAGE_TEMPLATE,
  },
};

export const BUSINESS_NOTIFICATION_TEMPLATE_VARIABLES = [
  {
    key: 'business_name',
    label: 'Nome do estabelecimento',
    placeholder: '{{business_name}}',
    description: 'Nome do negócio',
    example: 'Studio Bella',
  },
  {
    key: 'customer_name',
    label: 'Nome do cliente',
    placeholder: '{{customer_name}}',
    description: 'Nome do cliente',
    example: 'Maria',
  },
  {
    key: 'professional_name',
    label: 'Nome do profissional',
    placeholder: '{{professional_name}}',
    description: 'Nome do profissional',
    example: 'Joao Silva',
  },
  {
    key: 'service_name',
    label: 'Nome do serviço',
    placeholder: '{{service_name}}',
    description: 'Nome do serviço',
    example: 'Corte feminino',
  },
  {
    key: 'day',
    label: 'Dia (dd/MM)',
    placeholder: '{{day}}',
    description: 'Dia do agendamento',
    example: '12/03',
  },
  {
    key: 'day_with_preposition',
    label: 'Dia contextualizado',
    placeholder: '{{day_with_preposition}}',
    description: 'Hoje, amanhã ou em dd/MM',
    example: 'amanhã',
  },
  {
    key: 'time',
    label: 'Horário',
    placeholder: '{{time}}',
    description: 'Horário do agendamento',
    example: '14:30',
  },
  {
    key: 'client_app_url',
    label: 'Link do app de clientes',
    placeholder: '{{client_app_url}}',
    description: 'Link do app/site de clientes',
    example: 'https://clientes.marquei.com',
  },
  {
    key: 'confirmation_action',
    label: 'Ação de confirmação',
    placeholder: '{{confirmation_action}}',
    description: 'Frase pronta de confirmação',
    example: 'Para confirmar, basta acessar o aplicativo.',
  },
  {
    key: 'signup_hint',
    label: 'Aviso para criar conta',
    placeholder: '{{signup_hint}}',
    description: 'Texto opcional para quem ainda não possui conta',
    example: 'Caso ainda não tenha uma conta...',
  },
  {
    key: 'ios_app_url',
    label: 'Link iOS',
    placeholder: '{{ios_app_url}}',
    description: 'Link da App Store',
    example: 'https://apps.apple.com/...',
  },
  {
    key: 'android_app_url',
    label: 'Link Android',
    placeholder: '{{android_app_url}}',
    description: 'Link da Play Store',
    example: 'https://play.google.com/...',
  },
  {
    key: 'app_download_links',
    label: 'Bloco de links para baixar app',
    placeholder: '{{app_download_links}}',
    description: 'Bloco pronto com links de download',
    example: '• iOS: ...\n• Android: ...',
  },
] as const;

const TEMPLATE_VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const NAME_VARIABLE_KEYS = new Set([
  'business_name',
  'customer_name',
  'professional_name',
  'service_name',
]);

function normalizeTemplateLineBreaks(value: string) {
  let normalized = value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\/n(?=\/|$|\s)/g, '\n')
    .replace(/\r\n?/g, '\n');

  // Some old templates were saved as a single line with double spaces as separators.
  if (!normalized.includes('\n')) {
    normalized = normalized.replace(/[ \t]{2,}/g, '\n\n');
  }

  return normalized.replace(/\n{3,}/g, '\n\n');
}

export function renderBusinessNotificationTemplate({
  template,
  variables,
}: {
  template: string;
  variables: Record<string, string | number | null | undefined>;
}) {
  if (!template) return '';

  return normalizeTemplateLineBreaks(template)
    .replace(TEMPLATE_VARIABLE_REGEX, (_match, rawKey: string) => {
      let value = variables[rawKey];
      if (typeof value === 'string' && NAME_VARIABLE_KEYS.has(rawKey)) {
        value = value.trim();
      }
      if (value === undefined || value === null) return '';
      return String(value);
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeNotificationTemplate(value?: string | null) {
  if (typeof value !== 'string') return null;
  const trimmed = normalizeTemplateLineBreaks(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}
