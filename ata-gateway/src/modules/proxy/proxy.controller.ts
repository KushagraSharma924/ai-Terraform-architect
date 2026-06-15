import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtValidationGuard } from '../auth/jwt-validation.guard';
import * as httpProxy from 'http-proxy-middleware';

@Controller()
@UseGuards(JwtValidationGuard)
export class ProxyController {
  private readonly authProxy: ReturnType<typeof httpProxy.createProxyMiddleware>;
  private readonly projectProxy: ReturnType<typeof httpProxy.createProxyMiddleware>;

  constructor(private readonly config: ConfigService) {
    const authServiceUrl = config.get<string>('app.authServiceUrl')!;
    const projectServiceUrl = config.get<string>('app.projectServiceUrl')!;

    this.authProxy = httpProxy.createProxyMiddleware({
      target: authServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/api/v1': '' }, // /api/v1/auth/login → /auth/login
      on: {
        proxyReq: httpProxy.fixRequestBody,
        error: (err, _req, res) => {
          (res as Response).status(502).json({ error: 'BAD_GATEWAY', message: 'Auth service unavailable' });
        },
      },
    });

    this.projectProxy = httpProxy.createProxyMiddleware({
      target: projectServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/api/v1': '' },
      on: {
        proxyReq: httpProxy.fixRequestBody,
        error: (err, _req, res) => {
          (res as Response).status(502).json({ error: 'BAD_GATEWAY', message: 'Project service unavailable' });
        },
      },
    });
  }

  @All('api/v1/auth/*')
  proxyAuth(@Req() req: Request, @Res() res: Response) {
    return (this.authProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All('api/v1/workspaces/*')
  proxyWorkspaces(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All('api/v1/projects/*')
  proxyProjects(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All('api/v1/usage/*')
  proxyUsage(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }
}
