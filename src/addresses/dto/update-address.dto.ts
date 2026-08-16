import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

// الفلاتر النهاردة دايمًا بتبعت الحقول كلها مع بعض في PUT (شوف
// shipping_address_screen.dart)، فمفيش endpoint حاليًا بيستخدم partial
// update فعليًا — الـDTO ده موجود عشان أي عميل تاني (أو نسخة مستقبلية من
// الشاشة) يقدر يبعت PATCH بحقل واحد بس من غير ما يعيد كل العنوان
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
