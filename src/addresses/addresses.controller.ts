import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SafeUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.ts';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// العنوان شخصي بالكامل لكل يوزر (زي wishlist/cart) — مفيش أي route عام هنا.
// المسار users/me/shipping-address بالظبط زي ما ApiClient بيناديه في
// shipping_address_service.dart: GET/PUT '/users/me/shipping-address'
@UseGuards(JwtAuthGuard)
@Controller('users/me/shipping-address')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  // GET — بترجع 404 لو المستخدم لسه ماحفظش عنوان؛ الفلاتر بتعتبر ده
  // "مفيش عنوان" وترجع null من غير ما تعرض error للمستخدم
  @Get()
  findMine(@Req() req: RequestWithUser) {
    return this.addressesService.getMyAddress(req.user.id);
  }

  // PUT — الشاشة الوحيدة اللي بتنادي على ده دايمًا بتبعت الحقول كلها
  // (validated في الفورم نفسه)، فده upsert: create أول مرة، replace بعد كده
  @Put()
  save(@Req() req: RequestWithUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.saveMyAddress(req.user.id, dto);
  }

  // PATCH — مش مستخدمة من الفلاتر حاليًا، لكن موجودة لأي client يحتاج
  // partial update بدل ما يعيد بعت العنوان كامل
  @Patch()
  update(@Req() req: RequestWithUser, @Body() dto: UpdateAddressDto) {
    return this.addressesService.updateMyAddress(req.user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: RequestWithUser) {
    return this.addressesService.deleteMyAddress(req.user.id);
  }
}
