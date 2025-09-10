import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EditProfileDto } from '../dto/requests/edit-profile.dto';

type NormalizedPayload = {
  email?: string; // string normalizada ou undefined (não enviado)
  name?: string; // idem
  phone?: string; // idem
  document_number?: string | null; // null para limpar, string para setar, undefined para ignorar
  birthdate?: Date | null; // idem
};

@Injectable()
export class EditProfileUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: EditProfileDto, req: AppRequest) {
    const { personId, id: userId } = req.user;
    if (!personId) throw new NotFoundException('Perfil não encontrado');

    // 1) Normaliza apenas o que veio no DTO
    const norm = this.normalize(dto);

    // Nada para atualizar? encerra cedo
    if (this.isEmpty(norm)) {
      return null;
    }

    // 2) (Opcional) Regra de e-mail único por user_type=CUSTOMER
    //    Se existir unique index composto (email,user_type), remova este bloco.
    if (norm.email) {
      const existsCustomerWithEmail = await this.prisma.user.findFirst({
        where: {
          email: norm.email,
          user_type: 'CUSTOMER',
          NOT: { id: userId },
        },
        select: { id: true },
      });
      if (existsCustomerWithEmail) {
        throw new ConflictException('E-mail já em uso para conta de cliente');
      }
    }

    // 3) Atualização atômica numa transação, tratando conflitos via P2002
    return this.prisma.$transaction(async (tx) => {
      // Garante que a Person existe (e pertence ao usuário)
      const person = await tx.person.findUnique({
        where: { id: personId },
        select: { id: true },
      });
      if (!person) throw new NotFoundException('Perfil não encontrado');

      const userUpdateData: Prisma.UserUpdateInput = {};
      const personUpdateData: Prisma.PersonUpdateInput = {};

      if (norm.email !== undefined) userUpdateData.email = norm.email;
      if (norm.name !== undefined && norm.name.length > 0)
        userUpdateData.name = norm.name;
      if (norm.document_number !== undefined)
        userUpdateData.document_number = norm.document_number;

      if (norm.name !== undefined && norm.name.length > 0)
        personUpdateData.name = norm.name;
      if (norm.phone !== undefined && norm.phone.length > 0)
        personUpdateData.phone = norm.phone;
      if (norm.birthdate !== undefined)
        personUpdateData.birthdate = norm.birthdate;
      if (norm.document_number !== undefined)
        personUpdateData.document_number = norm.document_number;
      if (norm.email !== undefined) personUpdateData.email = norm.email;

      const data: Prisma.UserUpdateInput = { ...userUpdateData };
      if (Object.keys(personUpdateData).length > 0) {
        data.person = { update: personUpdateData };
      }

      if (Object.keys(data).length === 0) {
        return null; // nada para fazer
      }

      try {
        await tx.user.update({
          where: { id: userId },
          data,
          select: { id: true },
        });
      } catch (err) {
        // Mapeia violação de unique (P2002) para mensagens claras
        if (isUniqueConstraintError(err)) {
          const field = extractUniqueFieldFromError(
            err as Prisma.PrismaClientKnownRequestError,
          );
          throw new ConflictException(getConflictMessage(field));
        }
        throw err;
      }

      return null;
    });
  }

  // ---------- Helpers ----------

  private normalize(dto: EditProfileDto): NormalizedPayload {
    const out: NormalizedPayload = {};

    if ('email' in dto) {
      out.email =
        typeof dto.email === 'string'
          ? dto.email.trim().toLowerCase()
          : undefined;
    }

    if ('name' in dto)
      out.name = typeof dto.name === 'string' ? dto.name.trim() : undefined;

    if ('phone' in dto)
      out.phone = typeof dto.phone === 'string' ? dto.phone.trim() : undefined;

    if ('document_number' in dto) {
      if (dto.document_number === null) {
        out.document_number = null; // limpar documento
      } else if (typeof dto.document_number === 'string') {
        const digits = dto.document_number.replace(/\D/g, '');
        out.document_number = digits.length ? digits : null; // se vier só máscara → null
      } else {
        out.document_number = undefined;
      }
    }

    if ('birthdate' in dto) {
      // dto.birthdate pode vir como string ISO, Date, null…
      if (dto.birthdate === null) out.birthdate = null;
      else if (dto.birthdate instanceof Date) out.birthdate = dto.birthdate;
      else if (typeof dto.birthdate === 'string') {
        const d = new Date(dto.birthdate);
        out.birthdate = isNaN(d.getTime()) ? null : d;
      } else {
        out.birthdate = undefined;
      }
    }

    return out;
  }

  private isEmpty(obj: Record<string, unknown>) {
    // Considera undefined como "não enviado"
    return Object.values(obj).every((v) => v === undefined);
  }
}

function isUniqueConstraintError(
  err: unknown,
): err is Prisma.PrismaClientKnownRequestError {
  return !!err && typeof err === 'object' && (err as any).code === 'P2002';
}

function extractUniqueFieldFromError(
  err: Prisma.PrismaClientKnownRequestError,
): string | undefined {
  // Prisma geralmente preenche err.meta.target com o índice/coluna
  const target = (err.meta as any)?.target as string | string[] | undefined;
  if (Array.isArray(target) && target.length) return target[0];
  if (typeof target === 'string') return target;
  return undefined;
}

function getConflictMessage(field?: string) {
  switch (field) {
    case 'email':
      return 'E-mail já cadastrado';
    case 'phone':
      return 'Telefone já cadastrado';
    case 'document_number':
      return 'Documento já cadastrado';
    default:
      return 'Conflito de dados únicos';
  }
}
