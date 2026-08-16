import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../../generated/prisma/client';
import { OrdersRepository, OrderWithItems } from './orders.repository';
import { OrderResponseDto } from './dto/order-response.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  // GET /orders — OrdersService.fetchOrders() في الفلاتر (orders_service.dart)
  async findAllForUser(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.ordersRepository.findAllForUser(userId);
    return orders.map((order) => this.toResponse(order));
  }

  // GET /orders/:id — OrdersService.fetchOrderById() في الفلاتر بتلقط الـ404
  // (e.isNotFound) وترجع null بهدوء بدل ما تعرض error، فمهم نرمي
  // NotFoundException هنا زي AddressesService.getMyAddress بالظبط
  async findOneForUser(userId: string, id: string): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOneForUser(userId, id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.toResponse(order);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.updateStatus(id, status);
    return this.toResponse(order);
  }

  // public عشان CheckoutService (مديول تاني) يستخدمها كمان — response الـ
  // POST /orders لازم يفضل بنفس شكل response الـGET بالظبط، مصدر واحد
  // للـmapping بدل ما يتكرر في المكانين
  toResponse(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.id,
      date: order.createdAt.toISOString(),
      total: Number(order.total),
      status: order.status.toLowerCase(),
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        imageUrl: item.imageUrl,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    };
  }
}
