import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from './payment-method.dto';

// كل عنصر زي ما CheckoutRepository.placeOrder() في الفلاتر بيبنيه من
// CartItem (lib/repositories/checkout_repository.dart) — name/imageUrl/price
// بيوصلوا هنا بس CheckoutService (السيرفر) مابيثقش فيهم؛ بيجيب القيم
// الحقيقية من المنتج في الداتابيز نفسها عشان محدش يقدر يزوّر السعر من
// الفلاتر مباشرة. سايبينهم required هنا برضه عشان whitelist/forbidNonWhitelisted
// في main.ts هترفض أي حقل إضافي مش متعرّف في الـDTO
export class CheckoutItemDto {
  @IsString()
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;

  @IsString()
  name: string;

  @IsString()
  imageUrl: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a valid amount' })
  price: number;

  @IsInt({ message: 'quantity must be a whole number' })
  @IsPositive({ message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity must be 99 or less' })
  quantity: number;
}

// checkout_screen.dart بيجمعها من الفورم، ونفس الحقول اللي
// CheckoutRepository.placeOrder() بيبعتها تحت 'shippingAddress' بالظبط —
// مفيش 'country' هنا (بعكس users/me/shipping-address) لأن الفلاتر
// مابتجمعهاش في فورم الـcheckout
export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  name: string;

  @IsEmail({}, { message: 'Valid email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required.' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required.' })
  street: string;

  @IsString()
  @IsNotEmpty({ message: 'City is required.' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'State is required.' })
  state: string;

  @IsString()
  @IsNotEmpty({ message: 'ZIP code is required.' })
  zip: string;
}

// POST /orders — الـbody اللي CheckoutService.placeOrder() في الفلاتر
// بيبعته (checkout_service.dart). الـtotal بيوصل هنا للتوثيق بس؛ السيرفر
// بيعيد حسابه من subtotal الحقيقي + الشحن + الضريبة (نفس فورمولا
// shippingFor/taxFor/grandTotalFor في checkout_cubit.dart) عشان محدش يقدر
// يزوّر الإجمالي من الفلاتر مباشرة — شوف checkout.service.ts
export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Cart is empty' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'total must be a valid amount' })
  total: number;

  @IsEnum(PaymentMethod, {
    message: 'paymentMethod must be one of card, paypal, cod',
  })
  paymentMethod: PaymentMethod;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;
}
