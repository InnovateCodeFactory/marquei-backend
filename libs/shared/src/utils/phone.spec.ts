import {
  normalizePhoneNational,
  parseBrazilianPhone,
  toWhatsAppNumber,
} from './phone';

describe('phone utils', () => {
  it('trata DDD 55 (nacional, 11 dígitos) sem confundir com DDI', () => {
    expect(normalizePhoneNational('55991234567')).toBe('55991234567');
    expect(toWhatsAppNumber('55991234567')).toBe('5555991234567');
    expect(normalizePhoneNational('(55) 99123-4567')).toBe('55991234567');
  });

  it('DDD 55 fixo (10 dígitos)', () => {
    expect(normalizePhoneNational('5533334444')).toBe('5533334444');
    expect(toWhatsAppNumber('5533334444')).toBe('555533334444');
  });

  it('DDD 55 com DDI (12/13 dígitos) remove só o DDI', () => {
    expect(normalizePhoneNational('5555991234567')).toBe('55991234567');
    expect(normalizePhoneNational('+55 55 99123-4567')).toBe('55991234567');
    expect(toWhatsAppNumber('5555991234567')).toBe('5555991234567');
    expect(toWhatsAppNumber('555533334444')).toBe('555533334444');
  });

  it('outros DDDs, com e sem DDI/+', () => {
    expect(normalizePhoneNational('61999999999')).toBe('61999999999');
    expect(normalizePhoneNational('5561999999999')).toBe('61999999999');
    expect(normalizePhoneNational('+5561999999999')).toBe('61999999999');
    expect(toWhatsAppNumber('61999999999')).toBe('5561999999999');
    expect(toWhatsAppNumber('+55 (61) 99999-9999')).toBe('5561999999999');
    expect(toWhatsAppNumber('061999999999')).toBe('5561999999999');
  });

  it('rejeita inválidos', () => {
    for (const bad of [
      '',
      null,
      undefined,
      '9',
      '99',
      '3',
      '123456789',
      '+14155550123',
      '6188889999999',
      '61899999999',
      '0611999999999',
    ]) {
      expect(parseBrazilianPhone(bad as any)).toBeNull();
    }
  });

  it('é idempotente', () => {
    const n = normalizePhoneNational('+55 55 99123-4567')!;
    expect(normalizePhoneNational(n)).toBe(n);
    expect(normalizePhoneNational(toWhatsAppNumber(n))).toBe(n);
  });
});
