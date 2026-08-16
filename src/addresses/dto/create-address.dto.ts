import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// _ShippingAddressForm في الفلاتر بتـvalidate الكل كـ"required" ماعدا
// country (ليه قيمة افتراضية 'United States' في الـTextEditingController من
// الأول)، وبتبعت الحقول دي بالظبط في toJson(): name/street/city/state/zip/country
export class CreateAddressDto {
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must be under 100 characters' })
  name: string;

  @IsString()
  @MinLength(3, { message: 'Street address must be at least 3 characters' })
  @MaxLength(200, { message: 'Street address must be under 200 characters' })
  street: string;

  @IsString()
  @MinLength(1, { message: 'City is required' })
  @MaxLength(100, { message: 'City must be under 100 characters' })
  city: string;

  @IsString()
  @MinLength(1, { message: 'State is required' })
  @MaxLength(100, { message: 'State must be under 100 characters' })
  state: string;

  @IsString()
  @MinLength(1, { message: 'ZIP code is required' })
  @MaxLength(20, { message: 'ZIP code must be under 20 characters' })
  zip: string;

  // اختياري — لو الفلاتر بعتت string فاضي أو ماحطتش country خالص، السيرفر
  // بيرجع لنفس الديفولت اللي في الـTextEditingController بتاعها
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Country must be under 100 characters' })
  country?: string;
}
