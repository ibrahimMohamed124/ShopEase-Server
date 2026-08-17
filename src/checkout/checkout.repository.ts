import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

interface IdempotencyInput {
  key: string;
  endpoint: string;
  requestHash: string;
}

// كود P2002 من Prisma = unique constraint violation
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

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
    idempotency?: IdempotencyInput,
  ): Promise<OrderWithItems> {
    // بدون idempotency key (الحالة الافتراضية، ومعظم الطلبات)، السلوك
    // زي ما هو بالظبط من قبل — صفر تغيير في الـflow التقليدي
    if (!idempotency) {
      return this.createOrder(
        userId,
        lines,
        paymentMethod,
        shippingAddress,
        computeTotals,
      );
    }

    // لو نفس الـkey اتبعت قبل كده وخلّصت بنجاح، رجّع نفس الأوردر القديم
    // من غير ما نلمس الستوك تاني — ده اللي بيمنع الدبل-كليك أو retry
    // الفلاتر بعد timeout من إنه يعمل أوردر تاني مكرر
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        userId_key_endpoint: {
          userId,
          key: idempotency.key,
          endpoint: idempotency.endpoint,
        },
      },
      include: { order: { include: ORDER_INCLUDE } },
    });

    if (existing) {
      if (existing.requestHash !== idempotency.requestHash) {
        throw new ConflictException(
          'This Idempotency-Key was already used with a different request',
        );
      }
      return existing.order;
    }

    try {
      return await this.createOrder(
        userId,
        lines,
        paymentMethod,
        shippingAddress,
        computeTotals,
        idempotency,
      );
    } catch (err) {
      // Race نادر: طلبين وصلوا بنفس الـkey في نفس اللحظة تقريبًا، عدّوا
      // من فحص findUnique فوق قبل ما أي منهم يعمل commit. اللي يعمل commit
      // الأول بينجح عادي، والتاني بيصطدم بالـunique constraint هنا —
      // بنجيب الأوردر اللي اتعمل فعلاً ونرجّعه بدل ما نرمي error للعميل
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        const winner = await this.prisma.idempotencyKey.findUnique({
          where: {
            userId_key_endpoint: {
              userId,
              key: idempotency.key,
              endpoint: idempotency.endpoint,
            },
          },
          include: { order: { include: ORDER_INCLUDE } },
        });
        if (winner) return winner.order;
      }
      throw err;
    }
  }

  // التحقق من كل منتج + خصم الستوك + إنشاء الأوردر (+ صف idempotency
  // لو موجود) — كل ده جوه transaction واحدة عمدًا: لو أي خطوة فشلت، كل
  // حاجة بترجع لورا سوا، فمفيش ستوك اتخصم من غير أوردر، ومفيش idempotency
  // key اتسجل من غير الأوردر اللي بيوثقه
  private async createOrder(
    userId: string,
    lines: CheckoutLine[],
    paymentMethod: string,
    shippingAddress: CreateOrderShippingAddressInput,
    computeTotals: (subtotal: number) => ComputedTotals,
    idempotency?: IdempotencyInput,
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

      const order = await tx.order.create({
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

      // نفس الـtransaction اللي أنشأت الأوردر — لو أي حاجة فوق فشلت،
      // هذا السطر أصلاً منوصلوش، فمفيش idempotency key متسجل من غير
      // أوردر حقيقي وراه
      if (idempotency) {
        await tx.idempotencyKey.create({
          data: {
            userId,
            key: idempotency.key,
            endpoint: idempotency.endpoint,
            requestHash: idempotency.requestHash,
            orderId: order.id,
          },
        });
      }

      return order;
    });
  }
}