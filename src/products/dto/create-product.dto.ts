import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(150, { message: 'Name must be under 150 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(5000, { message: 'Description must be under 5000 characters' })
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid amount' })
  @IsPositive({ message: 'Price must be greater than 0' })
  price: number;

  // السعر قبل الخصم — لازم يكون أكبر من price، اتحقق منها كمان في الـservice
  // (مش هنا) عشان محتاجين نقارنها بـ price نفسه مش بس نتأكد إنها رقم موجب.
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Original price must be a valid amount' })
  @IsPositive({ message: 'Original price must be greater than 0' })
  originalPrice?: number;

  @IsString()
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'subcategoryId cannot be empty' })
  subcategoryId?: string;

  @IsArray({ message: 'images must be a list of URLs' })
  @ArrayMinSize(1, { message: 'At least one product image is required' })
  @ArrayMaxSize(10, { message: 'A product can have at most 10 images' })
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images: string[];

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Badge must be under 30 characters' })
  badge?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stockQuantity must be a whole number' })
  @Min(0, { message: 'stockQuantity cannot be negative' })
  stockQuantity?: number;
}