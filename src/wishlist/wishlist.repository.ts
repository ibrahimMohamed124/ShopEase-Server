import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WISHLIST_ITEM_INCLUDE = {
  product: { include: { category: true } },
} satisfies Prisma.WishlistItemInclude;

export type WishlistItemWithProduct = Prisma.WishlistItemGetPayload<{
  include: typeof WISHLIST_ITEM_INCLUDE;
}>;

@Injectable()
export class WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<WishlistItemWithProduct[]> {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: WISHLIST_ITEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(userId: string, productId: string) {
    return this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  add(userId: string, productId: string) {
    return this.prisma.wishlistItem.create({ data: { userId, productId } });
  }

  // deleteMany بدل delete عشان لو العنصر مش موجود أصلًا مايرميش P2025 —
  // remove/clear في الفلاتر عمليات idempotent (الـstate بيتفلتر محليًا برضو)
  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  }

  async clearAll(userId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId } });
  }
}
