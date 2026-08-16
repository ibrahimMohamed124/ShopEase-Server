import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ReviewRecord = Prisma.ReviewGetPayload<Record<string, never>>;

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProduct(productId: string): Promise<ReviewRecord[]> {
    return this.prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // بيستخدم الـ@@unique([productId, userId]) — بنتأكد بيها إن اليوزر
  // مايعملش أكتر من review لنفس المنتج
  findByProductAndUser(
    productId: string,
    userId: string,
  ): Promise<ReviewRecord | null> {
    return this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
  }

  create(data: Prisma.ReviewUncheckedCreateInput): Promise<ReviewRecord> {
    return this.prisma.review.create({ data });
  }

  findById(id: string): Promise<ReviewRecord | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  update(
    id: string,
    data: Prisma.ReviewUncheckedUpdateInput,
  ): Promise<ReviewRecord> {
    return this.prisma.review.update({ where: { id }, data });
  }

  delete(id: string): Promise<ReviewRecord> {
    return this.prisma.review.delete({ where: { id } });
  }

  async aggregateForProduct(
    productId: string,
  ): Promise<{ average: number; count: number }> {
    const result = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      average: result._avg.rating ?? 0,
      count: result._count._all,
    };
  }
}
