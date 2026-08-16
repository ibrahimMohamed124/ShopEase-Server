// نفس التلات قيم بالظبط اللي checkout_screen.dart بيعرضها في _PaymentOptions
// ('card' | 'paypal' | 'cod') — لو الفلاتر ضافت طريقة دفع جديدة، هنا أول
// مكان يتزود فيه عشان الـvalidation في checkout.dto.ts تعرفها
export enum PaymentMethod {
  CARD = 'card',
  PAYPAL = 'paypal',
  COD = 'cod',
}
