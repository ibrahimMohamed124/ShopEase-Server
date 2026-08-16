import { Injectable, NotFoundException } from '@nestjs/common';
import type { Address } from '../../generated/prisma/client';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly addressesRepository: AddressesRepository) {}

  // GET /users/me/shipping-address — ShippingAddressService.fetchAddress()
  // في الفلاتر بيتعامل مع 404 كـ"مفيش عنوان محفوظ لسه" ويرجّع null بهدوء
  // (e.isNotFound)، فمهم نرمي NotFoundException هنا لما الصف مش موجود
  async getMyAddress(userId: string): Promise<AddressResponseDto> {
    const address = await this.addressesRepository.findByUserId(userId);
    if (!address) {
      throw new NotFoundException('No shipping address saved yet');
    }
    return this.toResponse(address);
  }

  // PUT /users/me/shipping-address — ShippingAddressService.saveAddress()
  // بيبعت الكائن كامل دايمًا، فهنا upsert: أول مرة create، بعد كده replace
  async saveMyAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const address = await this.addressesRepository.upsert(userId, dto);
    return this.toResponse(address);
  }

  // مش مستخدمة من الفلاتر النهاردة، لكن موجودة عشان أي client تاني يقدر
  // يعمل partial update (PATCH) بدل ما يعيد بعت العنوان كامل
  async updateMyAddress(
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const current = await this.addressesRepository.findByUserId(userId);
    if (!current) {
      throw new NotFoundException('No shipping address saved yet');
    }
    const updated = await this.addressesRepository.update(userId, dto);
    return this.toResponse(updated);
  }

  async deleteMyAddress(userId: string): Promise<void> {
    await this.addressesRepository.remove(userId);
  }

  private toResponse(address: Address): AddressResponseDto {
    return {
      id: address.id,
      name: address.name,
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      updatedAt: address.updatedAt,
    };
  }
}
