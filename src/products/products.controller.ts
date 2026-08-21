import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductsQueryDto } from './dto/query-product.dto';
import { Role } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.ts';
import { RolesGuard } from '../common/guards/roles.guard.ts';
import { Roles } from '../common/decorators/roles.decorator.ts';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products?category=&search=&page=&limit=
  @Get()
  findAll(@Query() query: FindProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  // لازم يفضل قبل ':id' — لو نزلناه تحت، NestJS هيدور على منتج بـ id='featured'
  @Get('featured')
  findFeatured() {
    return this.productsService.findFeatured();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // أدمن بس يقدر يضيف/يعدل/يحذف منتجات — JwtAuthGuard بيتأكد إن فيه توكن
  // صالح، RolesGuard بيتأكد بعد كده إن req.user.role === ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
