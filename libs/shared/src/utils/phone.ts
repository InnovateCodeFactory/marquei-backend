const BR_DDI = '55';

export type ParsedBrazilianPhone = {
  /** DDD + número, sem DDI (10 ou 11 dígitos). Formato salvo no banco. */
  national: string;
  /** DDI 55 + DDD + número (12 ou 13 dígitos). Formato usado no envio. */
  international: string;
};

/**
 * Interpreta um telefone brasileiro em qualquer formato de entrada
 * ("+55 (61) 99999-9999", "61999999999", "5561999999999", "055 61 ...").
 *
 * Quem decide se há DDI é o TAMANHO, nunca o prefixo "55": o número nacional
 * tem 10 ou 11 dígitos e, com DDI, 12 ou 13. Assim o DDD 55 (RS) não é
 * confundido com o DDI 55: "55991234567" (11) é nacional e
 * "5555991234567" (13) já tem DDI.
 *
 * Retorna null se o número não for um telefone brasileiro válido.
 */
export function parseBrazilianPhone(
  raw?: string | null,
): ParsedBrazilianPhone | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;

  let national: string;
  if (digits.length === 10 || digits.length === 11) {
    national = digits;
  } else if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith(BR_DDI)
  ) {
    national = digits.slice(BR_DDI.length);
  } else {
    return null;
  }

  const ddd = Number(national.slice(0, 2));
  if (ddd < 11) return null;

  // celular (11 dígitos) sempre tem o 9 depois do DDD
  if (national.length === 11 && national[2] !== '9') return null;

  return { national, international: `${BR_DDI}${national}` };
}

/** Telefone para salvar no banco (DDD + número). Null se inválido. */
export function normalizePhoneNational(raw?: string | null): string | null {
  return parseBrazilianPhone(raw)?.national ?? null;
}

/** Telefone para enviar mensagem (55 + DDD + número). Null se inválido. */
export function toWhatsAppNumber(raw?: string | null): string | null {
  return parseBrazilianPhone(raw)?.international ?? null;
}
