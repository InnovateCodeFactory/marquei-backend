type ProhibitedContext = 'service' | 'customer' | 'business' | 'user';

const TEST_TERMS = [
  'teste',
  'test',
  'demo',
  'fake',
  'asdf',
  'qwerty',
  'sem nome',
  'semnome',
  'sem-nome',
  'nome teste',
  'cliente teste',
  'servico teste',
  'serviço teste',
  'estabelecimento teste',
  'barbearia teste',
  'novo cliente',
  'cliente novo',
  'teste 123',
  '123',
];

const PROFANITY_TERMS = [
  'caralho',
  'carai',
  'porra',
  'merda',
  'bosta',
  'buceta',
  'piranha',
  'arrombado',
  'arrombada',
  'fdp',
  'filho da puta',
  'filha da puta',
  'puta',
  'puto',
  'foda',
  'foder',
  'fodase',
  'foda se',
  'desgraca',
  'desgraça',
  'inferno',
  'babaca',
  'idiota',
  'imbecil',
  'retardado',
  'otario',
  'otária',
  'otaria',
  'viado',
  'viadinho',
  'viada',
  'corno',
  'corninho',
];

const PROHIBITED_BY_CONTEXT: Record<ProhibitedContext, string[]> = {
  service: [...TEST_TERMS, ...PROFANITY_TERMS],
  customer: [...TEST_TERMS, ...PROFANITY_TERMS],
  business: [...TEST_TERMS, ...PROFANITY_TERMS],
  user: [...TEST_TERMS, ...PROFANITY_TERMS],
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3);
}

export function hasProhibitedTerm(value: string, context: ProhibitedContext) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  const tokens = new Set(tokenize(value));
  const list = PROHIBITED_BY_CONTEXT[context] ?? [];

  for (const raw of list) {
    const term = normalizeText(raw);
    if (!term) continue;
    if (term.includes(' ')) {
      if (normalized.includes(term)) return true;
      continue;
    }
    if (tokens.has(term)) return true;
  }

  return false;
}

export function assertNoProhibitedTerm(
  value: string,
  context: ProhibitedContext,
) {
  if (hasProhibitedTerm(value, context)) {
    throw new Error('PROHIBITED_NAME');
  }
}
