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
  private readonly intentProxy: ReturnType<typeof httpProxy.createProxyMiddleware>;
  private readonly terraformProxy: ReturnType<typeof httpProxy.createProxyMiddleware>;

  constructor(private readonly config: ConfigService) {
    const authServiceUrl = config.get<string>('app.authServiceUrl')!;
    const projectServiceUrl = config.get<string>('app.projectServiceUrl')!;
    const intentServiceUrl = config.get<string>('app.intentServiceUrl')!;
    const terraformServiceUrl = config.get<string>('app.terraformServiceUrl')!;

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

    this.intentProxy = httpProxy.createProxyMiddleware({
      target: intentServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/api/v1': '' },
      on: {
        proxyReq: httpProxy.fixRequestBody,
        error: (err, _req, res) => {
          (res as Response).status(502).json({ error: 'BAD_GATEWAY', message: 'Intent service unavailable' });
        },
      },
    });

    this.terraformProxy = httpProxy.createProxyMiddleware({
      target: terraformServiceUrl,
      changeOrigin: true,
      pathRewrite: { '^/api/v1': '' },
      on: {
        proxyReq: httpProxy.fixRequestBody,
        error: (err, _req, res) => {
          (res as Response).status(502).json({ error: 'BAD_GATEWAY', message: 'Terraform generator service unavailable' });
        },
      },
    });
  }

  @All(['api/v1/auth', 'api/v1/auth/*'])
  proxyAuth(@Req() req: Request, @Res() res: Response) {
    return (this.authProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All(['api/v1/workspaces', 'api/v1/workspaces/*'])
  proxyWorkspaces(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  // specific project route for generations must precede the generic projects proxy route
  @All('api/v1/projects/:projectId/generations')
  proxyProjectGenerations(@Req() req: Request, @Res() res: Response) {
    return (this.intentProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All(['api/v1/projects', 'api/v1/projects/*'])
  proxyProjects(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All(['api/v1/usage', 'api/v1/usage/*'])
  proxyUsage(@Req() req: Request, @Res() res: Response) {
    return (this.projectProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All(['api/v1/generations', 'api/v1/generations/*'])
  proxyGenerations(@Req() req: Request, @Res() res: Response) {
    return (this.intentProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }

  @All(['api/v1/terraform-projects', 'api/v1/terraform-projects/*'])
  proxyTerraform(@Req() req: Request, @Res() res: Response) {
    return (this.terraformProxy as any)(req, res, (err: unknown) => {
      if (err) res.status(502).json({ error: 'BAD_GATEWAY' });
    });
  }
}
