type ComboItemRow = {
  sort_order: number;
  price_in_cents_snapshot: number;
  duration_minutes_snapshot: number;
  service: {
    id: string;
    name: string;
    is_active?: boolean;
  };
};

type ComboRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  pricing_mode: string;
  duration_mode: string;
  discount_percent: number | null;
  fixed_price_in_cents: number | null;
  custom_duration_minutes: number | null;
  base_price_in_cents: number;
  base_duration_minutes: number;
  final_price_in_cents: number;
  final_duration_minutes: number;
  created_at: Date;
  updated_at: Date;
  items: ComboItemRow[];
};

export function presentServiceCombo(combo: ComboRow) {
  const services = combo.items
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.service.id,
      name: item.service.name,
      price_in_cents_snapshot: item.price_in_cents_snapshot,
      duration_minutes_snapshot: item.duration_minutes_snapshot,
      is_active: item.service.is_active ?? true,
    }));

  return {
    id: combo.id,
    name: combo.name,
    description: combo.description,
    color: combo.color,
    is_active: combo.is_active,
    pricing_mode: combo.pricing_mode,
    duration_mode: combo.duration_mode,
    discount_percent: combo.discount_percent,
    fixed_price_in_cents: combo.fixed_price_in_cents,
    custom_duration_minutes: combo.custom_duration_minutes,
    base_price_in_cents: combo.base_price_in_cents,
    base_duration_minutes: combo.base_duration_minutes,
    final_price_in_cents: combo.final_price_in_cents,
    final_duration_minutes: combo.final_duration_minutes,
    discount_value_in_cents: Math.max(
      combo.base_price_in_cents - combo.final_price_in_cents,
      0,
    ),
    services_count: services.length,
    services,
    created_at: combo.created_at,
    updated_at: combo.updated_at,
  };
}
