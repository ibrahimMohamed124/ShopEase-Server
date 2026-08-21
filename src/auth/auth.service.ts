import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
// @types/jsonwebtoken types `expiresIn` as `StringValue | number`, a template-literal
// type (e.g. '15m', '30d'), not a plain `string` — so values read from ConfigService
// (typed as `string`) need an explicit cast to satisfy the compiler.
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../../generated/prisma/client';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const BCRYPT_ROUNDS = 12;

// شوف الشرح في forgotPassword()/resetPassword() ليه SHA-256 (مش bcrypt)
// آمن وكافي هنا: الـinput دايمًا high-entropy random token، مش secret
// اليوزر بيختاره.
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async register(dto: RegisterDto): Promise<{ user: SafeUser } & AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const tokens = await this.issueTokens(user.id, user.email);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(user: SafeUser): Promise<{ user: SafeUser } & AuthTokens> {
    const tokens = await this.issueTokens(user.id, user.email);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async refreshTokens(userId: string, email: string): Promise<AuthTokens> {
    const tokens = await this.issueTokens(userId, email);
    // Rotation: every refresh call issues a brand-new refresh token and
    // overwrites the stored hash — a stolen refresh token works once at
    // most before the legitimate client's next refresh invalidates it.
    await this.persistRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, null);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Deliberately silent — never reveal whether an email is registered
      // (prevents user-enumeration attacks).
      return;
    }

    // Single-use, short-lived reset token. Only a hash is persisted — same
    // pattern as refresh tokens — so a DB leak alone can't be used to
    // reset anyone's password.
    //
    // [أمان] بنستخدم SHA-256 هنا مش bcrypt. الفرق عن الـpassword hashing
    // العادي إن الـtoken نفسه عبارة عن 32 random bytes (256 bits entropy)
    // من randomBytes — مش حاجة اليوزر مختارها زي الباسورد، فمفيش خطر
    // dictionary/brute-force attack عليه حتى بـhash سريع. وده بيدينا فايدة
    // مهمة: نقدر نعمل query مباشر بالـhash (findByResetTokenHash) بدل ما
    // نلف على كل الـtokens الفعالة ونعمل bcrypt.compare (cost=12) لكل
    // واحد فيهم — كان ده بيفتح باب resource-exhaustion لو حد قدر يعمل
    // forgot-password لعدد كبير من الحسابات في وقت متقارب.
    const resetToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const resetTokenHash = hashResetToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.usersService.setResetToken(
      user.id,
      resetTokenHash,
      resetTokenExpiresAt,
    );

    // TODO: wire up a real mail provider and email `resetToken` to the
    // user instead of logging it. Never log this in production.
    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const resetUrl = `${appUrl}/reset-password.html?token=${resetToken}`;
    const expiresInMinutes = RESET_TOKEN_TTL_MS / 60000;

    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetUrl,
      expiresInMinutes,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // [أمان] بدل ما نلف على كل اليوزرز اللي عندهم active reset token
    // ونعمل bcrypt.compare لكل واحد، بنحسب SHA-256 hash للـtoken المبعوت
    // ونعمل query مباشر بيه (indexed lookup). أمان الـtoken لسه محفوظ لأنه
    // عالي entropy (256 bits) — شوف الشرح في forgotPassword() فوق.
    const user = await this.usersService.findByResetTokenHash(
      hashResetToken(token),
    );

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePasswordHash(user.id, newPasswordHash);
  }

  private async issueTokens(
    userId: string,
    email: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email };

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '30d',
        ) as StringValue,
      }),
    ]);

    return { token, refreshToken };
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);
  }
}
