// app/shared/mappers/mail-type-to-verify-purpose.ts
import { SendMailTypeEnum } from '@app/shared/enum';
import { VerifyPurpose } from '@prisma/client';

export function mapMailTypeToVerifyPurpose(
  type: SendMailTypeEnum,
): VerifyPurpose {
  switch (type) {
    // Verificação de e-mail no onboarding
    case SendMailTypeEnum.VALIDATION_CODE:
      // Se você também usa VALIDATION_CODE para outras coisas, pode receber um hint no DTO, mas
      // se seu uso atual é sempre verificação de email/onboarding, mapeie para:
      return VerifyPurpose.ACCOUNT_EMAIL_VERIFY;

    // Troca de senha (logado) – você disse que usa VALIDATION_CODE também.
    // Caso você publique `type = PASSWORD_CHANGE` para diferenciar:
    case SendMailTypeEnum.PASSWORD_CHANGE:
      return VerifyPurpose.PASSWORD_CHANGE_VERIFY;

    // Esqueci a senha fora da área logada com OTP
    // (se você publica FORGOT_PASSWORD para este cenário)
    case SendMailTypeEnum.FORGOT_PASSWORD:
      return VerifyPurpose.PASSWORD_RESET_OTP;

    default:
      // Bloqueia usos indevidos (welcome/appointments não devem gerar token)
      throw new Error(
        `SendMailTypeEnum '${type}' não é válido para geração de OTP.`,
      );
  }
}
