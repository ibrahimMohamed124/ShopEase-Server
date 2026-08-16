// AppUser.fromJson() في الفلاتر بيقرا id/name/email/avatarUrl من الـresponse
// مباشرة من غير غلاف — ProfileService._readUser() بتاخد
// response['user'] ?? response['data'] ?? response، فلو مرجعناه من غير أي
// غلاف زي ده هيتقرا صح برضو. avatarUrl هنا لازم يبدأ بـ '/' لأن الفلاتر
// بتبنيه كـ '${AppConfig.apiBaseUrl}${avatarUrl}' في edit_profile_screen.dart
export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}
