import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// EditProfileScreen في الفلاتر بيبعت name و email مع بعض دايمًا (الـform بتاعه
// بيـvalidate الاتنين قبل الإرسال)، لكن سايبهم IsOptional هنا عشان الـendpoint
// يقبل partial update كمان لو حد استخدمه من مكان تاني غير شاشة الـedit profile
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(50, { message: 'Name must be under 50 characters' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email' })
  email?: string;
}
