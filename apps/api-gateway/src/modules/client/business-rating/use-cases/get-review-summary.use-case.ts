// use-cases/get-review-summary.usecase.ts
import { PrismaService } from '@app/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetReviewSummaryDto } from '../dto/get-reviews-summary.dto';

@Injectable()
export class GetReviewSummaryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetReviewSummaryDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: query.business_slug },
      select: {
        rating: true,
        reviews_count: true,
        total_one_star: true,
        total_two_star: true,
        total_three_star: true,
        total_four_star: true,
        total_five_star: true,
      },
    });

    if (!business) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }

    const formatAvgWithComma = (n: number) =>
      n.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

    const formatCompactWithK = (value: number): string => {
      if (value < 1000) return value.toString();
      if (value < 1_000_000) {
        const v = Math.round((value / 1000) * 10) / 10; // 1 casa
        return String(v).replace('.', ',') + 'k';
      }
      const v = Math.round((value / 1_000_000) * 10) / 10;
      return String(v).replace('.', ',') + 'M';
    };

    const total = business.reviews_count;
    const pct = (count: number, denom: number) =>
      denom > 0 ? Math.round((count / denom) * 100) : 0;

    const breakdown = {
      one: {
        count: formatCompactWithK(business.total_one_star),
        percent: pct(business.total_one_star, total),
      },
      two: {
        count: formatCompactWithK(business.total_two_star),
        percent: pct(business.total_two_star, total),
      },
      three: {
        count: formatCompactWithK(business.total_three_star),
        percent: pct(business.total_three_star, total),
      },
      four: {
        count: formatCompactWithK(business.total_four_star),
        percent: pct(business.total_four_star, total),
      },
      five: {
        count: formatCompactWithK(business.total_five_star),
        percent: pct(business.total_five_star, total),
      },
    };

    return {
      rating: business.rating, // ex: 4.8
      rating_formatted: formatAvgWithComma(business.rating), // ex: "4,8"
      total_formatted: formatCompactWithK(total), // ex: "1,2k"
      total,
      breakdown,
    };
  }
}
