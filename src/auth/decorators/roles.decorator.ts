import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client';

export const ROLES_KEY = 'roles';

// استخدام: @Roles(Role.ADMIN) فوق أي route محتاج صلاحية أدمن — بيتحط جنب
// @UseGuards(JwtAuthGuard, RolesGuard)، مش بديل عنه. RolesGuard هو اللي
// فعليًا بيقرا الميتاداتا دي ويقارنها بـ req.user.role.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
