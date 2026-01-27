import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EditProfessionalProfileDto } from '../dto/requests/edit-profile.dto';
import { hasProhibitedTerm } from '@app/shared/utils';

type NormalizedPayload = {
  email?: string;
  name?: string;
  phone?: string | null;
  document_number?: string | null;
};

@Injectable()
export class EditProfessionalProfileUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: EditProfessionalProfileDto, req: AppRequest) {
    const { id: userId, current_selected_business_id } = req.user;
    if (!userId) throw new NotFoundException('Usuário não encontrado');
    if (!current_selected_business_id)
      throw new NotFoundException('Negócio selecionado não encontrado');

    const prof = await this.prisma.professionalProfile.findFirst({
      where: { userId, business_id: current_selected_business_id },
      select: { id: true },
    });
    if (!prof) throw new NotFoundException('Perfil profissional não encontrado');

    const norm = this.normalize(dto);
    if (this.isEmpty(norm)) return null;

    if (norm.name && hasProhibitedTerm(norm.name, 'user')) {
      throw new BadRequestException('Nome contém termos não permitidos');
    }

    // e-mail único por user_type=PROFESSIONAL
    if (norm.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: norm.email, user_type: 'PROFESSIONAL', NOT: { id: userId } },
        select: { id: true },
      });
      if (exists) throw new ConflictException('E-mail já em uso para conta profissional');
    }

    return this.prisma.$transaction(async (tx) => {
      const userUpdate: Prisma.UserUpdateInput = {};
      const profUpdate: Prisma.ProfessionalProfileUpdateInput = {};

      if (norm.email !== undefined) userUpdate.email = norm.email;
      if (norm.name !== undefined && norm.name.length > 0)
        userUpdate.name = norm.name;
      if (norm.document_number !== undefined)
        userUpdate.document_number = norm.document_number;

      if (norm.phone !== undefined) profUpdate.phone = norm.phone ?? null;

      const data: Prisma.UserUpdateInput = { ...userUpdate };
      // update ProfessionalProfile in parallel
      if (Object.keys(profUpdate).length > 0) {
        await tx.professionalProfile.update({ where: { id: prof.id }, data: profUpdate, select: { id: true } });
      }

      if (Object.keys(data).length === 0) return null;

      try {
        await tx.user.update({ where: { id: userId }, data, select: { id: true } });
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          const field = extractUniqueFieldFromError(err as Prisma.PrismaClientKnownRequestError);
          throw new ConflictException(getConflictMessage(field));
        }
        throw err;
      }

      return null;
    });
  }

  private normalize(dto: EditProfessionalProfileDto): NormalizedPayload {
    const out: NormalizedPayload = {};
    if ('email' in dto)
      out.email = typeof dto.email === 'string' ? dto.email.trim().toLowerCase() : undefined;
    if ('name' in dto)
      out.name = typeof dto.name === 'string' ? dto.name.trim() : undefined;
    if ('phone' in dto) out.phone = dto.phone === null ? null : typeof dto.phone === 'string' ? dto.phone.trim() : undefined;
    if ('document_number' in dto) {
      if (dto.document_number === null) out.document_number = null;
      else if (typeof dto.document_number === 'string') {
        const digits = dto.document_number.replace(/\D/g, '');
        out.document_number = digits.length ? digits : null;
      } else out.document_number = undefined;
    }
    return out;
  }

  private isEmpty(obj: Record<string, unknown>) {
    return Object.values(obj).every((v) => v === undefined);
  }
}

function isUniqueConstraintError(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return !!err && typeof err === 'object' && (err as any).code === 'P2002';
}
function extractUniqueFieldFromError(err: Prisma.PrismaClientKnownRequestError): string | undefined {
  const target = (err.meta as any)?.target as string | string[] | undefined;
  if (Array.isArray(target) && target.length) return target[0];
  if (typeof target === 'string') return target;
  return undefined;
}
function getConflictMessage(field?: string) {
  switch (field) {
    case 'email':
      return 'E-mail já cadastrado';
    default:
      return 'Conflito de dados únicos';
  }
}
