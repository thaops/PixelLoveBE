import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * User Decorator
 * Extracts the authenticated user from the request
 * Usage: @CurrentUser() user: any
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

