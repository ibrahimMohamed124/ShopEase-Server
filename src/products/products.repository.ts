import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FindProductsParams {
  categoryId?: string;
  search?: string;
  skip?: number;
  take?: number;
}

const PRODUCT_INCLUDE = {
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    params: FindProductsParams,
  ): Promise<{ items: ProductWithCategory[]; total: number }> {
    const where = this.buildWhere(params);

    // بنجيب الصفحة والعدد الكلي في نفس الوقت بدل ما نستنى واحد بعد التاني
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  findFeatured(take = 6): Promise<ProductWithCategory[]> {
    return this.prisma.product.findMany({
      where: { badge: { not: null }, inStock: true },
      include: PRODUCT_INCLUDE,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<ProductWithCategory | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
  }

  updateRatingSummary(
    id: string,
    rating: number,
    reviewCount: number,
  ): Promise<ProductWithCategory> {
    return this.prisma.product.update({
      where: { id },
      data: { rating, reviewCount },
      include: PRODUCT_INCLUDE,
    });
  }

  create(data: Prisma.ProductCreateInput): Promise<ProductWithCategory> {
    return this.prisma.product.create({ data, include: PRODUCT_INCLUDE });
  }

  update(
    id: string,
    data: Prisma.ProductUpdateInput,
  ): Promise<ProductWithCategory> {
    return this.prisma.product.update({
      where: { id },
      data,
      include: PRODUCT_INCLUDE,
    });
  }

  remove(id: string): Promise<ProductWithCategory> {
    return this.prisma.product.delete({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
  }

  private buildWhere(params: FindProductsParams): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
