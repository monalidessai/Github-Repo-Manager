import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const session = (req as any).session;

    if (!session || !session.user || !session.user.accessToken) {
      throw new UnauthorizedException('Authentication required. Please login with GitHub.');
    }

    return true;
  }
}
