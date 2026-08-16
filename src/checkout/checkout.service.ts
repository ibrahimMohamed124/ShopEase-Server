import { Injectable } from '@nestjs/common';
import { CheckoutDto } from './dto/checkout.dto';
import { CheckoutResponseDto } from './dto/checkout-response.dto';
import { CheckoutRepository } from './checkout.repository';
import { OrdersService } from '../orders/orders.service';

// نفس القيم بالظبط اللي checkout_cubit.dart بيستخدمها
// (shippingFor/taxFor/grandTotalFor) — لازم تفضل متطابقة عشان الرقم اللي
// السيرفر بيحسبه يبقى نفسه اللي الفلاتر عرضته للمستخدم قبل ما يدوس "Place Order"
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_COST = 9.99;
const TAX_RATE = 0.08;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly checkoutRepository: CheckoutRepository,
    private readonly ordersService: OrdersService,
  ) {}

  // POST /orders — CheckoutService.placeOrder() في الفلاتر
  // (checkout_service.dart). بنتجاهل dto.total ودة items[].price/name/imageUrl
  // الجايين من الكلاينت عمدًا — الأسعار والإجمالي بيتحسبوا من الداتابيز
  // نفسها جوه CheckoutRepository، فمفيش طريقة إن المستخدم يغيّر السعر أو
  // يزوّد كمية أكتر من الستوك المتاح فعليًا
  async placeOrder(
    userId: string,
    dto: CheckoutDto,
  ): Promise<CheckoutResponseDto> {
    const order = await this.checkoutRepository.placeOrder(
      userId,
      dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      dto.paymentMethod,
      dto.shippingAddress,
      (subtotal) => this.computeTotals(subtotal),
    );

    // نفس OrdersService.toResponse المستخدمة في GET /orders — عشان شكل
    // الـresponse يفضل واحد سواء الأوردر جديد أو مسترجع
    return { order: this.ordersService.toResponse(order) };
  }

  private computeTotals(subtotal: number) {
    const shippingCost =
      subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + shippingCost + tax) * 100) / 100;
    return { shippingCost, tax, total };
  }
}
