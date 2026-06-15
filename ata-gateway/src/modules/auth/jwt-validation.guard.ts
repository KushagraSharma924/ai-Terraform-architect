import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Routes that don't require a valid JWT (auth-service handles them)
const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/v1/auth/register' },
  { method: 'POST', path: '/api/v1/auth/login' },
  { method: 'POST', path: '/api/v1/auth/refresh' },
  { method: 'POST', path: '/api/v1/auth/forgot-password' },
  { method: 'POST', path: '/api/v1/auth/verify-email' },
  { method: 'POST', path: '/api/v1/auth/reset-password' },
  { method: 'GET', path: '/api/v1/auth/oauth/google' },
  { method: 'GET', path: '/api/v1/auth/oauth/google/callback' },
  { method: 'GET', path: '/api/v1/auth/oauth/github' },
  { method: 'GET', path: '/api/v1/auth/oauth/github/callback' },
];

@Injectable()
export class JwtValidationGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Pass public routes through
    const isPublic = PUBLIC_ROUTES.some(
      (r) =>
        r.method === request.method &&
        (request.path === r.path || request.path.startsWith(r.path)),
    );
    if (isPublic) return true;

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED' });
    }

    try {
      const publicKey = this.config.get<string>('app.jwtPublicKey')!;
      const payload = this.jwt.verify(token, {
        algorithms: ['RS256'],
        publicKey,
      });

      // Inject user claims as headers for downstream services
      request.headers['x-user-id'] = payload.sub;
      request.headers['x-user-role'] = payload.role;
      request.headers['x-user-tier'] = payload.subscriptionTier;

      return true;
    } catch {
      throw new UnauthorizedException({ error: 'UNAUTHORIZED' });
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
