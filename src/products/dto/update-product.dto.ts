import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// PATCH /products/:id — كل الحقول اختيارية، بيبعت المستخدم اللي عايز يعدله بس.
// لو مش عندك @nestjs/mapped-types متثبت: npm i @nestjs/mapped-types
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateProductDto extends PartialType(CreateProductDto) {
    originalPrice: number | undefined;
}