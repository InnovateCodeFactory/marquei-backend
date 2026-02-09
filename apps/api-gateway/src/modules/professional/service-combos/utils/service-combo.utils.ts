import { BadRequestException } from '@nestjs/common';
import { ServiceComboDurationModeDto, ServiceComboPricingModeDto } from '../dto/requests';

type ComputeValuesInput = {
  pricingMode: ServiceComboPricingModeDto;
  durationMode: ServiceComboDurationModeDto;
  basePriceInCents: number;
  baseDurationMinutes: number;
  fixedPriceInCents?: number | null;
  discountPercent?: number | null;
  customDurationMinutes?: number | null;
};

export function normalizeOptionalString(value?: string | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeComboServiceIds(serviceIds: string[] = []) {
  return Array.from(
    new Set(
      serviceIds
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  );
}

export function assertMinComboServices(serviceIds: string[]) {
  if (serviceIds.length < 2) {
    throw new BadRequestException('Um combo precisa de pelo menos 2 serviços');
  }
}

export function computeComboValues(input: ComputeValuesInput) {
  const {
    pricingMode,
    durationMode,
    basePriceInCents,
    baseDurationMinutes,
    fixedPriceInCents,
    discountPercent,
    customDurationMinutes,
  } = input;

  if (basePriceInCents < 0 || baseDurationMinutes <= 0) {
    throw new BadRequestException(
      'Serviços do combo possuem valores inválidos para cálculo',
    );
  }

  let finalPriceInCents = basePriceInCents;
  let normalizedFixedPriceInCents: number | null = null;
  let normalizedDiscountPercent: number | null = null;

  if (pricingMode === ServiceComboPricingModeDto.FIXED_PRICE) {
    if (
      fixedPriceInCents === undefined ||
      fixedPriceInCents === null ||
      Number.isNaN(fixedPriceInCents)
    ) {
      throw new BadRequestException(
        'fixed_price_in_cents é obrigatório para preço fixo',
      );
    }
    if (fixedPriceInCents < 0) {
      throw new BadRequestException(
        'fixed_price_in_cents não pode ser negativo',
      );
    }
    normalizedFixedPriceInCents = Math.round(fixedPriceInCents);
    finalPriceInCents = normalizedFixedPriceInCents;
  } else {
    if (
      discountPercent === undefined ||
      discountPercent === null ||
      Number.isNaN(discountPercent)
    ) {
      throw new BadRequestException(
        'discount_percent é obrigatório para desconto percentual',
      );
    }
    if (discountPercent < 0 || discountPercent > 100) {
      throw new BadRequestException(
        'discount_percent deve estar entre 0 e 100',
      );
    }

    normalizedDiscountPercent = Number(discountPercent);
    finalPriceInCents = Math.max(
      0,
      Math.round(basePriceInCents * (1 - normalizedDiscountPercent / 100)),
    );
  }

  let finalDurationMinutes = baseDurationMinutes;
  let normalizedCustomDurationMinutes: number | null = null;

  if (durationMode === ServiceComboDurationModeDto.CUSTOM) {
    if (
      customDurationMinutes === undefined ||
      customDurationMinutes === null ||
      Number.isNaN(customDurationMinutes)
    ) {
      throw new BadRequestException(
        'custom_duration_minutes é obrigatório para duração customizada',
      );
    }
    if (customDurationMinutes <= 0) {
      throw new BadRequestException(
        'custom_duration_minutes deve ser maior que zero',
      );
    }
    normalizedCustomDurationMinutes = Math.round(customDurationMinutes);
    finalDurationMinutes = normalizedCustomDurationMinutes;
  }

  if (finalDurationMinutes <= 0) {
    throw new BadRequestException('A duração final do combo é inválida');
  }

  const discountValueInCents = Math.max(basePriceInCents - finalPriceInCents, 0);

  return {
    base_price_in_cents: Math.round(basePriceInCents),
    base_duration_minutes: Math.round(baseDurationMinutes),
    final_price_in_cents: Math.round(finalPriceInCents),
    final_duration_minutes: Math.round(finalDurationMinutes),
    fixed_price_in_cents: normalizedFixedPriceInCents,
    discount_percent: normalizedDiscountPercent,
    custom_duration_minutes: normalizedCustomDurationMinutes,
    discount_value_in_cents: discountValueInCents,
  };
}
