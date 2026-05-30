import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TenantRequest extends Request {
  tenantId?: string;
  userId?: string;
  userRole?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  use(req: TenantRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const tenantHeader = req.headers['x-tenant-id'] as string;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = this.jwtService.verify(token, {
          secret: this.config.get('JWT_SECRET'),
        });
        req.tenantId = tenantHeader || payload.tenantId;
        req.userId = payload.sub;
        req.userRole = payload.role;
      } catch {
        // Will be caught by auth guard
      }
    }
    next();
  }
}
