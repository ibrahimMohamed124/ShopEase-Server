import {
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(60, { message: 'Name must be under 60 characters' })
  name: string;

  // مش لازم — IconMapper في الفلاتر بيحدد الأيقونة من اسم الكاتيجوري تلقائي،
  // ده لو عايز تفرض أيقونة مخصصة بدل الافتراضية
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsHexColor({ message: 'colorHex must be a valid hex color, e.g. #6C63FF' })
  colorHex?: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;
}
