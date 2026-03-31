import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) throw err || new ForbiddenException('Unauthorized');

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler())
      ?? this.reflector.get<string[]>('roles', context.getClass());

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied');
    }

    return user;
  }
}