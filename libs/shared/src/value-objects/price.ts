export class Price {
  private readonly value: number;

  constructor(value: number) {
    if (value < 0) {
      throw new Error('Price cannot be negative');
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
