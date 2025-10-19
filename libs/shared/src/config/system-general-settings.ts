import 'dotenv/config';

export type SystemGeneralSettings = {
  contact_email: string | null;
  contact_phone: string | null;
  terms_of_service_url: string | null;
  privacy_policy_url: string | null;
  help_center_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  whatsapp_number: string | null;
  marquei_app_store_url: string | null;
  marquei_play_store_url: string | null;
  marquei_pro_app_store_url: string | null;
  marquei_pro_play_store_url: string | null;
  default_business_image: string | null;
  default_business_cover_image: string | null;
  default_image_avatar: string | null;
  maintenance_mode: boolean;
  maintenance_message: string | null;
};

function parseGeneralConfig(): Partial<SystemGeneralSettings> {
  const raw = process.env.GENERAL_CONFIG;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed
      ? (parsed as Partial<SystemGeneralSettings>)
      : {};
  } catch {
    return {};
  }
}

const cfg = parseGeneralConfig();

function str(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v || null;
  return String(v);
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string')
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  if (typeof v === 'number') return v !== 0;
  return fallback;
}

export const systemGeneralSettings: Readonly<SystemGeneralSettings> =
  Object.freeze({
    contact_email: str((cfg as any).contact_email),
    contact_phone: str((cfg as any).contact_phone),
    terms_of_service_url: str((cfg as any).terms_of_service_url),
    privacy_policy_url: str((cfg as any).privacy_policy_url),
    help_center_url: str((cfg as any).help_center_url),
    facebook_url: str((cfg as any).facebook_url),
    instagram_url: str((cfg as any).instagram_url),
    twitter_url: str((cfg as any).twitter_url),
    linkedin_url: str((cfg as any).linkedin_url),
    whatsapp_number: str((cfg as any).whatsapp_number),
    marquei_app_store_url: str((cfg as any).marquei_app_store_url),
    marquei_play_store_url: str((cfg as any).marquei_play_store_url),
    marquei_pro_app_store_url: str((cfg as any).marquei_pro_app_store_url),
    marquei_pro_play_store_url: str((cfg as any).marquei_pro_play_store_url),
    default_business_image: str((cfg as any).default_business_image),
    default_business_cover_image: str(
      (cfg as any).default_business_cover_image,
    ),
    default_image_avatar: str((cfg as any).default_image_avatar),
    maintenance_mode: bool((cfg as any).maintenance_mode, false),
    maintenance_message: str((cfg as any).maintenance_message),
  });

export function getSystemSetting<K extends keyof SystemGeneralSettings>(
  key: K,
): SystemGeneralSettings[K] {
  return systemGeneralSettings[key];
}
