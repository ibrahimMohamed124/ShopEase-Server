import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { User } from '../../generated/prisma/client';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // الميثودز دي مستخدمة من AuthService و JwtStrategy، واجهتها فضلت زي ما
  // هي بالظبط عشان محدش يتكسر — بس دلوقتي بتنادي على UsersRepository
  // بدل ما تكلم Prisma مباشرة
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    return this.usersRepository.create(data);
  }

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    return this.usersRepository.updateRefreshTokenHash(
      userId,
      refreshTokenHash,
    );
  }

  findUsersWithActiveResetToken(): Promise<User[]> {
    return this.usersRepository.findUsersWithActiveResetToken();
  }

  setResetToken(
    userId: string,
    resetTokenHash: string | null,
    resetTokenExpiresAt: Date | null,
  ): Promise<void> {
    return this.usersRepository.setResetToken(
      userId,
      resetTokenHash,
      resetTokenExpiresAt,
    );
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    return this.usersRepository.updatePasswordHash(userId, passwordHash);
  }

  // [جديد] — PATCH /users/me
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const current = await this.usersRepository.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    // لو غيّر الإيميل، لازم نتأكد إن مفيش يوزر تاني واخده قبل كده —
    // نفس الفحص اللي في AuthService.register()، هنا بس بنستثني اليوزر نفسه
    if (dto.email && dto.email !== current.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
    }

    const updated = await this.usersRepository.updateProfile(userId, {
      name: dto.name,
      email: dto.email,
    });
    return this.toResponse(updated);
  }

  // [جديد] — POST /users/me/avatar، بيتنادى من الكنترولر بعد ما multer يخزن
  // الملف على الديسك فعلاً ويديله اسم فريد
  async updateAvatar(
    userId: string,
    avatarPath: string,
  ): Promise<UserResponseDto> {
    const current = await this.usersRepository.findById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.usersRepository.updateAvatarUrl(
      userId,
      avatarPath,
    );

    // بنمسح الصورة القديمة من الديسك بعد نجاح التحديث في الداتابيز —
    // ده تنظيف مش أكتر، فمينفعش يفشّل الـrequest لو حصل فيه أي مشكلة
    if (current.avatarUrl && current.avatarUrl !== avatarPath) {
      await this.deleteAvatarFile(current.avatarUrl);
    }

    return this.toResponse(updated);
  }

  private async deleteAvatarFile(avatarUrl: string): Promise<void> {
    try {
      // avatarUrl مخزّن كمسار نسبي زي '/uploads/avatars/xxx.jpg'، وده
      // بالظبط نفس المجلد اللي main.ts بيعمله useStaticAssets عليه (public/)
      const filePath = join(process.cwd(), 'public', avatarUrl);
      await fs.unlink(filePath);
    } catch {
      // الملف ممكن يكون اتمسح قبل كده أو مش موجود أصلاً — تجاهل متعمد
    }
  }

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }
}
