import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrderWithItems } from '../orders/orders.repository';
import { CreateOrderShippingAddressInput } from '../orders/dto/create-order.dto';

const ORDER_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

interface CheckoutLine {
  productId: string;
  quantity: number;
}

interface ComputedTotals {
  shippingCost: number;
  tax: number;
  total: number;
}

@Injectable()
export class CheckoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  // التحقق من كل منتج + خصم الستوك + إنشاء الأوردر — كل ده جوه transaction
  // واحدة عمدًا: لو منتج مش موجود أو الستوك مش كفاية لأي عنصر، الـtransaction
  // كلها بترجع لورا (rollback) ومفيش أي ستوك بيتخصم من غير ما الأوردر يتعمل
  // فعلاً، ولا العكس. الأسعار والاسم والصورة بتتجاب من المنتج نفسه هنا
  // (tx.product.findUnique) مش من الفلاتر — ده اللي بيمنع أي تلاعب بالسعر
  async placeOrder(
    userId: string,
    lines: CheckoutLine[],
    paymentMethod: string,
    shippingAddress: CreateOrderShippingAddressInput,
    computeTotals: (subtotal: number) => ComputedTotals,
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const resolvedItems: {
        productId: string;
        name: string;
        imageUrl: string;
        price: number;
        quantity: number;
      }[] = [];

      for (const line of lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        if (!product) {
          throw new NotFoundException(`Product ${line.productId} not found`);
        }
        if (!product.inStock || product.stockQuantity < line.quantity) {
          throw new BadRequestException(
            `"${product.name}" doesn't have enough stock left`,
          );
        }

        const remaining = product.stockQuantity - line.quantity;
        await tx.product.update({
          where: { id: product.id },
          data: { stockQuantity: remaining, inStock: remaining > 0 },
        });

        resolvedItems.push({
          productId: product.id,
          name: product.name,
          imageUrl: product.images[0] ?? '',
          price: Number(product.price),
          quantity: line.quantity,
        });
      }

      const subtotal = resolvedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const { shippingCost, tax, total } = computeTotals(subtotal);

      return tx.order.create({
        data: {
          userId,
          subtotal,
          shippingCost,
          tax,
          total,
          paymentMethod,
          shippingName: shippingAddress.name,
          shippingEmail: shippingAddress.email,
          shippingPhone: shippingAddress.phone,
          shippingStreet: shippingAddress.street,
          shippingCity: shippingAddress.city,
          shippingState: shippingAddress.state,
          shippingZip: shippingAddress.zip,
          items: { create: resolvedItems },
        },
        include: ORDER_INCLUDE,
      });
    });
  }
}
