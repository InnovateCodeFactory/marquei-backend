import { Logger } from '@nestjs/common';

export class Price {
  private readonly value: number;
  private readonly logger = new Logger(Price.name);

  constructor(value: number) {
    if (isNaN(value)) {
      this.logger.error('Incorrect value for Price');
      return;
    }
    this.value = value;
  }

  getValue(): number {
    return this.value;
  }

  toCurrency(currency: string = 'BRL'): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(this.value / 100);
  }
}
