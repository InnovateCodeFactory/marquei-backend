import { PrismaService } from '@app/shared';
import { HashingService } from '@app/shared/services';
import { BadRequestException, Injectable } from '@nestjs/common';
import { FirstAccessDto } from '../dto/requests/firts-access.dto';

@Injectable()
export class FirstAccessUseCase {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashingService: HashingService,
  ) {}

  async execute(body: FirstAccessDto, userId: string) {
    const { mailRequestId, newPassword } = body;

    // TODO: Implement logic to validate the mailRequestId

    const update = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: await this.hashingService.hash(newPassword),
        first_access: false,
        temporary_password: null,
      },
    });

    if (!update) {
      throw new BadRequestException('Failed to update password');
    }

    return { message: 'Senha atualizada com succsso' };
  }
}
