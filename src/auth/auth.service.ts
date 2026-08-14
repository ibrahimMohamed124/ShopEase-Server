import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
// @types/jsonwebtoken types `expiresIn` as `StringValue | number`, a template-literal
// type (e.g. '15m', '30d'), not a plain `string` — so values read from ConfigService
// (typed as `string`) need an explicit cast to satisfy the compiler.
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

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
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<SafeUser | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return null;

    return { id: user.id, name: user.name, email: user.email };
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
      user: { id: user.id, name: user.name, email: user.email },
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

    // Single-use, short-lived reset token. Only the hash is persisted —
    // same pattern as refresh tokens — so a DB leak alone can't be used
    // to reset anyone's password.
    const resetToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, BCRYPT_ROUNDS);
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.usersService.setResetToken(
      user.id,
      resetTokenHash,
      resetTokenExpiresAt,
    );

    // TODO: wire up a real mail provider and email `resetToken` to the
    // user instead of logging it. Never log this in production.
    console.log(`[auth] password reset token for ${email}: ${resetToken}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // We only stored a hash, so we have to compare against every
    // outstanding reset token — this table stays small since tokens are
    // single-use and short-lived, so it's not a real cost.
    const candidates = await this.usersService.findUsersWithActiveResetToken();

    for (const candidate of candidates) {
      if (!candidate.resetTokenHash) continue;
      const matches = await bcrypt.compare(token, candidate.resetTokenHash);
      if (matches) {
        const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.usersService.updatePasswordHash(
          candidate.id,
          newPasswordHash,
        );
        return;
      }
    }

    throw new UnauthorizedException('Invalid or expired reset token');
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
