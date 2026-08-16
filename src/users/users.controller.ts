import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../auth/auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// main.ts بيعمل useStaticAssets على مجلد public/ من روت المشروع، فالصور
// هنا لازم تتخزن جوّاه عشان تبقى قابلة للوصول عن طريق نفس الـبيس URL
const AVATAR_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'avatars');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// multer مبيعملش الفولدر لوحده لو مش موجود، فبننشئه أول ما الموديول يتحمّل
mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

// كل الـroutes هنا شخصية لليوزر المسجل دخول بس (زي الـcart) — مفيش أي route عام
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // PATCH /users/me — ده اللي ProfileService.updateProfile() في الفلاتر
  // بينادي عليه بـ {name, email} في الـbody
  @Patch('me')
  updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  // POST /users/me/avatar، multipart field اسمه "avatar" — بالظبط زي
  // ApiClient.uploadFile() و ProfileService.uploadAvatar() في الفلاتر
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: AVATAR_UPLOAD_DIR,
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Only JPEG, PNG or WEBP images are allowed',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file was provided');
    }

    // بنخزن مسار نسبي بس (يبدأ بـ '/') — مش الـabsolute path على الديسك،
    // عشان الفلاتر بيبنيه كـ '${AppConfig.apiBaseUrl}${avatarUrl}' في
    // edit_profile_screen.dart
    const avatarPath = `/uploads/avatars/${file.filename}`;
    return this.usersService.updateAvatar(req.user.id, avatarPath);
  }
}
