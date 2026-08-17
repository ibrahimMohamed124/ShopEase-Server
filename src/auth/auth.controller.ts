import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, SafeUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

interface RequestWithUser extends Request {
  user: SafeUser;
}

interface RequestWithRefreshUser extends Request {
  user: SafeUser & { refreshToken: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 5 محاولات تسجيل حساب لكل IP كل دقيقة — يمنع bots من عمل حسابات بالجملة
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 5 محاولات لوجن لكل IP كل دقيقة — أهم ليمِت في الملف ده، ده اللي بيمنع
  // brute-force على الباسوردات
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@Req() req: RequestWithUser, @Body() _dto: LoginDto) {
    // LocalAuthGuard already validated the credentials via LocalStrategy
    // and attached the user to req.user — _dto only exists so Nest still
    // validates/documents the request body shape.
    return this.authService.login(req.user);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: RequestWithRefreshUser) {
    return this.authService.refreshTokens(req.user.id, req.user.email);
  }

  // 3 طلبات لكل IP كل 15 دقيقة — بيمنع حد يستخدم الـendpoint ده كـ
  // "email bomb" على إيميل حد تاني، وبيبطّئ أي محاولة enumeration
  @Throttle({ default: { limit: 3, ttl: 15 * 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account exists for this email, a reset link has been sent.',
    };
  }

  // 10 محاولات لكل IP كل 15 دقيقة — الـtoken نفسه عشوائي وطويل، بس الليمِت
  // ده بيقلل مساحة أي محاولة brute-force على أي حساب مفتوح له reset token
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully.' };
  }
}
