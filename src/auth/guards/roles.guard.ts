import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../generated/prisma/client';
import { SafeUser } from '../auth.service';

interface RequestWithUser extends Request {
  user: SafeUser;
}

// لازم يتحط بعد JwtAuthGuard في الـ@UseGuards array (الترتيب مهم —
// Nest بينفذ الـguards بالترتيب اللي مكتوبة بيه) عشان req.user يكون
// متعمل populate قبل ما الـguard ده يحاول يقرا req.user.role
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // مفيش @Roles() على الـroute ده → مفيش قيد إضافي، JwtAuthGuard كفاية
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
