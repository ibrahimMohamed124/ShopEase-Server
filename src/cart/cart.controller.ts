import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// السلة شخصية بالكامل لكل يوزر — مفيش أي route عام هنا
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /cart — لازم يرجع array خام (من غير غلاف)، زي الـwishlist بالظبط
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.cartService.findAll(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@Req() req: RequestWithUser, @Body() dto: AddToCartDto) {
    return this.cartService.add(req.user.id, dto.productId, dto.quantity);
  }

  @Patch(':productId')
  update(
    @Req() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.update(req.user.id, productId, dto.quantity);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: RequestWithUser, @Param('productId') productId: string) {
    return this.cartService.remove(req.user.id, productId);
  }

  // DELETE /cart (من غير param) — clearCart()
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@Req() req: RequestWithUser) {
    return this.cartService.clear(req.user.id);
  }
}
