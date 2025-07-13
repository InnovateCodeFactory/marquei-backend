import { PrismaService } from '@app/shared';
import { CurrentUser } from '@app/shared/types/app-request';
import { Price } from '@app/shared/value-objects';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { endOfMonth, startOfMonth } from 'date-fns';
import { GetStatementDto } from '../dto/requests/get-statement.dto';

@Injectable()
export class GetStatementUseCase implements OnModuleInit {
  private readonly logger = new Logger(GetStatementUseCase.name);
  constructor(private readonly prismaService: PrismaService) {}

  async onModuleInit() {
    // const now = subHours(new Date(), 3);
    // const start = new Date(2025, 0, 1); // 01/01/2025
    // const end = now; // até hoje
    // const data = Array.from({ length: 140 }, (_, i) => {
    //   const type = Math.random() > 0.3 ? 'INCOME' : 'OUTCOME';
    //   let value_in_cents = Math.floor(
    //     Math.random() * (100000 - 1500 + 1) + 1500,
    //   );
    //   if (type === 'OUTCOME') value_in_cents = -value_in_cents;
    //   const created_at = new Date(
    //     start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    //   );
    //   return {
    //     professionalProfileId: 'cmcflsnrp0002yx9jbbgvp0m4',
    //     type: type as any,
    //     value_in_cents,
    //     created_at,
    //     description: `Statement ${Math.random().toString(36).substring(7)}`,
    //     businessId: 'cmcflsng10000yx9j0tytkum8',
    //   };
    // });
    // await this.prismaService.professionalStatement.createMany({
    //   data,
    //   skipDuplicates: true,
    // });
    // this.logger.log(`Created ${data.length} statements`);
  }

  async execute(query: GetStatementDto, user: CurrentUser) {
    const {
      limit,
      page,
      end_date,
      professional_id,
      start_date,
      type,
      calculate_totals,
    } = query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    if (isNaN(pageNumber) || isNaN(limitNumber)) {
      throw new BadRequestException('Page and limit must be valid numbers');
    }

    const where: any = {
      businessId: user.current_selected_business_id,
    };

    if (start_date) where.created_at = { gte: new Date(start_date) };
    if (end_date)
      where.created_at = { ...where.created_at, lte: new Date(end_date) };
    if (type) where.type = type.toUpperCase();
    if (professional_id) where.professionalProfileId = professional_id;

    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [statements, total, income, expense] = await Promise.all([
      this.prismaService.professionalStatement.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          type: true,
          value_in_cents: true,
          created_at: true,
          description: true,
        },
      }),

      this.prismaService.professionalStatement.count({ where }),

      ...(calculate_totals === 'true'
        ? [
            this.prismaService.professionalStatement.aggregate({
              where: {
                businessId: user.current_selected_business_id,
                type: 'INCOME',
                created_at: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
              _sum: { value_in_cents: true },
            }),
            this.prismaService.professionalStatement.aggregate({
              where: {
                businessId: user.current_selected_business_id,
                type: 'OUTCOME',
                created_at: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
              _sum: { value_in_cents: true },
            }),
          ]
        : [null, null]),
    ]);

    const obj: any = {
      statements: statements.map((statement) => ({
        ...statement,
        value: new Price(statement.value_in_cents).toCurrency(),
      })),
      total,
      page: pageNumber,
      limit: limitNumber,
      hasMorePages: total > pageNumber * limitNumber,
    };

    if (calculate_totals === 'true' && income && expense) {
      const total_income_current_month = income._sum.value_in_cents ?? 0;
      const total_expense_current_month = expense._sum.value_in_cents ?? 0;

      obj.total_income_current_month = new Price(
        total_income_current_month,
      ).toCurrency();
      obj.total_expense_current_month = new Price(
        total_expense_current_month,
      ).toCurrency();
      obj.net_total_current_month = new Price(
        total_income_current_month + total_expense_current_month,
      ).toCurrency();
    }

    return obj;
  }
}
