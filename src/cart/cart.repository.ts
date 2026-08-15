import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CART_ITEM_INCLUDE = {
  product: { include: { category: true } },
} satisfies Prisma.CartItemInclude;

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: typeof CART_ITEM_INCLUDE;
}>;

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<CartItemWithProduct[]> {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: CART_ITEM_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(
    userId: string,
    productId: string,
  ): Promise<CartItemWithProduct | null> {
    return this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: CART_ITEM_INCLUDE,
    });
  }

  // POST /cart — بيزوّد الكمية لو المنتج موجود بالفعل بدل ما يستبدلها،
  // ده الفرق المتعمد بينها وبين setQuantity (PATCH)
  increment(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItemWithProduct> {
    return this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId, productId, quantity },
      include: CART_ITEM_INCLUDE,
    });
  }

  setQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItemWithProduct> {
    return this.prisma.cartItem.update({
      where: { userId_productId: { userId, productId } },
      data: { quantity },
      include: CART_ITEM_INCLUDE,
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId, productId } });
  }

  async clearAll(userId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
  }
}
