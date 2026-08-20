import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { SafeUser } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// الأوردرات شخصية بالكامل لكل يوزر (زي wishlist/cart/addresses) — مفيش
// أي route عام هنا. إنشاء الأوردر (POST) مش هنا — ده مسؤولية
// CheckoutController في مديول تاني (checkout)، شوف orders.repository.ts
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // GET /orders — لازم يرجع array مغلف تحت 'orders': OrdersService.fetchOrders()
  // في الفلاتر بتدور على data['orders'] ?? data['data'] ?? raw
  @Get()
  async findAll(@Req() req: RequestWithUser) {
    const orders = await this.ordersService.findAllForUser(req.user.id);
    return { orders };
  }

  // GET /orders/:id — مغلفة تحت 'order' زي POST /orders بالظبط، عشان
  // fetchOrderById في الفلاتر بتدور على response['order'] ?? ['data'] ?? raw
  @Get(':id')
  async findOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const order = await this.ordersService.findOneForUser(req.user.id, id);
    return { order };
  }

  // [جديد] — GET /orders/:id/tracking، مغلفة تحت 'tracking' عشان
  // TrackOrderService.fetchTracking() في الفلاتر بتدور على
  // data['tracking'] ?? data['data'] ?? raw. مفيش RolesGuard هنا عمدًا —
  // نفس فكرة /:id/cancel، أي عميل عادي يقدر يتتبع أوردره هو بس (findOneForUser
  // جوه getTracking بيتأكد من الملكية).
  @Get(':id/tracking')
  async getTracking(@Req() req: RequestWithUser, @Param('id') id: string) {
    const tracking = await this.ordersService.getTracking(req.user.id, id);
    return { tracking };
  }

  // [جديد] — العميل بيلغي أوردره هو، مفيش RolesGuard هنا عمدًا (بعكس
  // /:id/status تحت) لأن أي عميل عادي لازم يقدر يلغي أوردر لسه بيتحضّر.
  // orders_service.dart (الفلاتر) بينادي PATCH /orders/:id/cancel بالظبط —
  // كان الـroute ده مش موجود خالص قبل كده (Cannot PATCH .../cancel).
  @Patch(':id/cancel')
  async cancel(@Req() req: RequestWithUser, @Param('id') id: string) {
    const order = await this.ordersService.cancelForUser(req.user.id, id);
    return { order };
  }

  // أدمن بس يقدر يغيّر حالة أي أوردر — العميل العادي عنده GET بس فوق
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(id, dto.status);
    return { order };
  }
}
