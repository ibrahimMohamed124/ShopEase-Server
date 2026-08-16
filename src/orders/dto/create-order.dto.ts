// شكل البيانات المطلوبة فعليًا عشان يتعمل Order في الداتابيز — مش HTTP DTO
// (مفيش class-validator decorators هنا) لأنها مش بتتحقق منها مباشرة من
// body request؛ CheckoutRepository هو اللي بيبنيها بعد ما يتأكد إن كل
// المنتجات موجودة وفيها ستوك كفاية، وبعد ما يجيب السعر/الاسم/الصورة
// الحقيقيين من الداتابيز نفسها (مش من اللي بعته الفلاتر في checkout.dto.ts)
export interface CreateOrderItemInput {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface CreateOrderShippingAddressInput {
  name: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface CreateOrderDto {
  userId: string;
  items: CreateOrderItemInput[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentMethod: string;
  shippingAddress: CreateOrderShippingAddressInput;
}
