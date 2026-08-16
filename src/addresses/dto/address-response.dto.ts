// ShippingAddress.fromJson() في الفلاتر بيقرا الحقول دي مباشرة من غير غلاف
// (ApiClient بيرجع الـbody الخام، والـService بيعمل response['address'] ??
// response['data'] ?? response — فرجّع الكائن ده direct بيتقرا صح في الحالتين)
export interface AddressResponseDto {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  updatedAt: Date;
}
