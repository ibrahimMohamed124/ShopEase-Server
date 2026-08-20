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
import { memoryStorage } from 'multer';
import { mkdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import sharp from 'sharp';
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
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_AVATAR_DIMENSION_PX = 2048; // caps decompression-bomb-style inputs

// [أمان] الفحص الحقيقي بيتم لاحقًا على الـmagic bytes الفعلية للملف (شوف
// resolveRealImageType تحت)، مش على file.mimetype ولا file.originalname
// (الاتنين client-supplied وسهل تزويرهم). القايمة دي بس sharp output format
// ids المسموح بيهم، وكل واحد ليه امتداد ثابت بنستخدمه إحنا مش الكلاينت.
const ALLOWED_SHARP_FORMATS: Record<string, string> = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};
// نفس القايمة لكن بصيغة MIME type، مستخدمة بس كـfast-reject اختياري في
// multer fileFilter (تحسين UX، مش security boundary — الفحص الحقيقي جوه
// resolveRealImageType). SVG ممنوعة عمدًا: هي XML بتقبل <script> جواها،
// وده أكتر صيغة عرضة للـstored XSS لو اتسيرفت بـContent-Type بتاعها.
const CLIENT_HINT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// multer مبيعملش الفولدر لوحده لو مش موجود، فبننشئه أول ما الموديول يتحمّل
mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });

// [أمان] بيحدد نوع الملف الحقيقي من محتواه (magic bytes) عن طريق sharp
// نفسه — لو sharp عرف يفك تشفير الصورة وnormalize لها format معروف،
// يبقى فعلاً صورة raster سليمة. أي حاجة تانية (SVG، HTML متنكر بامتداد
// صورة، ملف تالف، polyglot) بترمي هنا وبترفض. مفيش أي اعتماد على
// file.mimetype ولا file.originalname في القرار ده.
async function resolveRealImageType(
  buffer: Buffer,
): Promise<{ format: string; extension: string }> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    throw new BadRequestException('The uploaded file is not a valid image');
  }

  const format = metadata.format;
  if (!format || !(format in ALLOWED_SHARP_FORMATS)) {
    throw new BadRequestException('Only JPEG, PNG or WEBP images are allowed');
  }

  return { format, extension: ALLOWED_SHARP_FORMATS[format] };
}

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
  //
  // [أمان] الملف بيتخزن في الميموري الأول (مش على الديسك مباشرة زي قبل
  // كده) عشان نقدر نتحقق من نوعه الحقيقي ونعيد ترميزه (re-encode) قبل ما
  // نكتبه على الديسك. ده بيقفل ثغرة كانت موجودة: الفحص كان بيتم على
  // file.mimetype (client-supplied، سهل تزويره) بينما الامتداد المتخزن به
  // الملف كان جاي من file.originalname (كمان client-supplied) — يعني حد
  // كان يقدر يبعت Content-Type: image/jpeg مع originalname "x.svg" وجواه
  // SVG فيه <script>، فيتخزن كـ<uuid>.svg ويتسيرف بـContent-Type:
  // image/svg+xml (Express بيحدده من الامتداد الحقيقي) → stored XSS، خصوصًا
  // إن main.ts معطّل فيه الـCSP على الـstatic assets.
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        // Fast-reject بناءً على الهيدر اللي الكلاينت بعته — تحسين UX بس
        // (رسالة خطأ سريعة من غير ما نستنى الأپلود يكمل)، مش الفحص الحقيقي.
        // الفحص الحقيقي بيتم على المحتوى نفسه في resolveRealImageType()
        // تحت، بعد ما الملف يوصل كامل.
        if (!CLIENT_HINT_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
  async uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No image file was provided');
    }

    // 1) بنتحقق من نوع الملف الحقيقي من محتواه، مش من أي هيدر بعته الكلاينت.
    const { extension } = await resolveRealImageType(file.buffer);

    // 2) بنعيد ترميز الصورة من الصفر بـsharp بدل ما نكتب bytes الكلاينت
    // زي ما هي. ده بيتخلص من أي payload متخبي جوه الملف (حتى لو الامتداد
    // والـmagic bytes سليمين ظاهريًا) لأن sharp بيفك تشفير البيكسلات
    // الفعلية ويعمل re-serialize، وبيمسح أي metadata (زي EXIF) تلقائيًا
    // مادام مفيش .withMetadata() متنادى. بنحدد أقصى أبعاد كمان كحماية من
    // decompression-bomb-style inputs.
    let reencoded: Buffer;
    try {
      reencoded = await sharp(file.buffer)
        .rotate()
        .resize({
          width: MAX_AVATAR_DIMENSION_PX,
          height: MAX_AVATAR_DIMENSION_PX,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat(
          extension === '.jpg'
            ? 'jpeg'
            : (extension.slice(1) as 'png' | 'webp'),
        )
        .toBuffer();
    } catch {
      throw new BadRequestException('The uploaded file is not a valid image');
    }

    // 3) الاسم بيتبني من UUID عشوائي + الامتداد اللي إحنا حددناه بناءً على
    // النوع الحقيقي المتحقق منه — مفيش أي جزء من اسم الملف جاي من الكلاينت.
    const filename = `${randomUUID()}${extension}`;
    await fs.writeFile(join(AVATAR_UPLOAD_DIR, filename), reencoded);

    // بنخزن مسار نسبي بس (يبدأ بـ '/') — مش الـabsolute path على الديسك،
    // عشان الفلاتر بيبنيه كـ '${AppConfig.apiBaseUrl}${avatarUrl}' في
    // edit_profile_screen.dart
    const avatarPath = `/uploads/avatars/${filename}`;
    return this.usersService.updateAvatar(req.user.id, avatarPath);
  }
}
