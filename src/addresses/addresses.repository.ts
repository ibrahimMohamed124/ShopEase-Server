import { Injectable } from '@nestjs/common';
import type { Address } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Address | null> {
    return this.prisma.address.findUnique({ where: { userId } });
  }

  // PUT /users/me/shipping-address بيتصرف كـupsert — أول save بيعمل create،
  // أي save بعد كده بيعمل replace كامل لنفس الصف (بفضل الـ@unique على userId)
  upsert(userId: string, data: CreateAddressDto): Promise<Address> {
    const country = data.country?.trim() || 'United States';
    return this.prisma.address.upsert({
      where: { userId },
      create: { ...data, country, userId },
      update: { ...data, country },
    });
  }

  update(userId: string, data: UpdateAddressDto): Promise<Address> {
    return this.prisma.address.update({ where: { userId }, data });
  }

  // deleteMany بدل delete عشان تفضل idempotent زي remove/clear في
  // WishlistRepository — DELETE على عنوان مش موجود مايرميش 404
  async remove(userId: string): Promise<void> {
    await this.prisma.address.deleteMany({ where: { userId } });
  }
}
