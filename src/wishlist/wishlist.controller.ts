import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.ts';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// الـwishlist شخصي بالكامل لكل يوزر — مفيش أي route عام هنا
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  // GET /wishlist — لازم يرجع array خام (من غير غلاف)، الفلاتر بتعمل
  // (data as List<dynamic>) مباشرة على الـresponse
  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.wishlistService.findAll(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  add(@Req() req: RequestWithUser, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.add(req.user.id, dto.productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: RequestWithUser, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.id, productId);
  }

  // DELETE /wishlist (من غير param) — clearWishlist()
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@Req() req: RequestWithUser) {
    return this.wishlistService.clear(req.user.id);
  }
}
