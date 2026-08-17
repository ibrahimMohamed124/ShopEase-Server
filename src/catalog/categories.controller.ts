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
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /categories — ده اللي بينادَى من CategoryService.fetchCategories() في الفلاتر
  @Get()
  findAllCategories() {
    return this.categoriesService.findAllCategories();
  }

  @Get(':id')
  findCategory(@Param('id') id: string) {
    return this.categoriesService.findCategory(id);
  }

  // أدمن بس يقدر يضيف/يعدل/يحذف categories
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param('id') id: string) {
    return this.categoriesService.removeCategory(id);
  }

  // GET /categories/:categoryId/subcategories — نفس المسار بالظبط اللي
  // بتناديه SubcategoryService.fetchSubcategories() في الفلاتر
  @Get(':categoryId/subcategories')
  findSubcategories(@Param('categoryId') categoryId: string) {
    return this.categoriesService.findSubcategories(categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':categoryId/subcategories')
  @HttpCode(HttpStatus.CREATED)
  createSubcategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateSubcategoryDto,
  ) {
    return this.categoriesService.createSubcategory(categoryId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':categoryId/subcategories/:subcategoryId')
  updateSubcategory(
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
    @Body() dto: UpdateSubcategoryDto,
  ) {
    return this.categoriesService.updateSubcategory(
      categoryId,
      subcategoryId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':categoryId/subcategories/:subcategoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSubcategory(
    @Param('categoryId') categoryId: string,
    @Param('subcategoryId') subcategoryId: string,
  ) {
    return this.categoriesService.removeSubcategory(categoryId, subcategoryId);
  }
}
