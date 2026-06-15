import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // If coming through gateway, user headers are already injected
    const gatewayUserId = request.headers['x-user-id'] as string | undefined;
    if (gatewayUserId) {
      (request as any).user = {
        id: gatewayUserId,
        email: request.headers['x-user-email'] as string,
        role: request.headers['x-user-role'] as string,
        subscriptionTier: request.headers['x-user-tier'] as string,
      };
      return true;
    }

    // Direct access: validate JWT ourselves
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException({ error: 'UNAUTHORIZED' });

    try {
      const publicKey = this.config.get<string>('app.jwtPublicKey')!;
      const payload = this.jwt.verify(token, { algorithms: ['RS256'], publicKey });
      (request as any).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        subscriptionTier: payload.subscriptionTier,
      };
      return true;
    } catch {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED' });
    }
  }

  private extractToken(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
