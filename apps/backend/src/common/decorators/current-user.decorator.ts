import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSession } from '@repo-manager/shared';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.session?.user;
  },
);
