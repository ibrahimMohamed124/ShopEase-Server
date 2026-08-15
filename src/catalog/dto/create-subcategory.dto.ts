import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

// categoryId مش موجود هنا لأنه جاي من الـroute param (/categories/:categoryId/subcategories)
// مش من الـbody — عشان الرابط بينهم يتفرض من الـURL نفسه مش من حاجة المستخدم بعتها
export class CreateSubcategoryDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(60, { message: 'Name must be under 60 characters' })
  name: string;

  @IsOptional()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl?: string;
}
