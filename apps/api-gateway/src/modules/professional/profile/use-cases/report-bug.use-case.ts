import { PrismaService } from '@app/shared';
import { AppRequest } from '@app/shared/types/app-request';
import { Injectable } from '@nestjs/common';
import { ReportBugDto } from '../dto/requests/report-bug.dto';

@Injectable()
export class ReportBugUseCase {
  constructor(private readonly prismaService: PrismaService) {}

  async execute(dto: ReportBugDto, req: AppRequest) {
    await this.prismaService.bugReports.create({
      data: {
        user: { connect: { id: req.user.id } },
        description: dto.description,
      },
    });

    return null;
  }
}

