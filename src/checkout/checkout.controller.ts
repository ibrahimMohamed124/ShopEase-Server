import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// POST /orders — بالظبط نفس المسار اللي CheckoutService.placeOrder() في
// الفلاتر بينادي عليه (checkout_service.dart). القراءة (GET /orders,
// GET /orders/:id) مسؤولية OrdersController في مديول تاني (orders)، وده
// متعمد: checkout بيعمل "الكتابة" بس (إنشاء أوردر جديد من الكارت)
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  placeOrder(@Req() req: RequestWithUser, @Body() dto: CheckoutDto) {
    return this.checkoutService.placeOrder(req.user.id, dto);
  }
}
