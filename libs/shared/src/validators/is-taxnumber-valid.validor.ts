import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTaxNumberValid', async: false })
export class IsTaxNumberValidConstraint
  implements ValidatorConstraintInterface
{
  validate(text: string) {
    if (!text) return false;

    const cpfOrCnpj = text.replace(/[^\d]+/g, '');

    if (cpfOrCnpj.length === 11) return this.isCpfValid(cpfOrCnpj);
    if (cpfOrCnpj.length === 14) return this.isCnpjValid(cpfOrCnpj);

    return false;
  }

  isCpfValid(cpf: string) {
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }
    rest = (sum * 10) % 11;

    if (rest === 10 || rest === 11) {
      rest = 0;
    }

    if (rest !== parseInt(cpf.substring(9, 10), 10)) {
      return false;
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }
    rest = (sum * 10) % 11;

    if (rest === 10 || rest === 11) {
      rest = 0;
    }

    if (rest !== parseInt(cpf.substring(10, 11), 10)) {
      return false;
    }

    return true;
  }

  isCnpjValid(cnpj: string) {
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (result !== parseInt(digits.charAt(0), 10)) {
      return false;
    }

    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    if (result !== parseInt(digits.charAt(1), 10)) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'O documento é inválido.';
  }
}
