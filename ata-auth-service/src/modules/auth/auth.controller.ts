import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateTokenDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard, GithubAuthGuard } from './guards/refresh-token.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@ata/shared-types';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.auth.logout(dto.refreshToken, user.sub, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ─── Get current user ──────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    };
  }

  // ─── Email verification ────────────────────────────────────────────────────

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  // ─── Password reset ────────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  // ─── OAuth – Google ────────────────────────────────────────────────────────

  @Get('oauth/google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google consent page
  }

  @Get('oauth/google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = (req as any).user;
    const frontendUrl = this.config.get<string>('app.frontendUrl');
    res.redirect(
      `${frontendUrl}/oauth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  // ─── OAuth – GitHub ────────────────────────────────────────────────────────

  @Get('oauth/github')
  @UseGuards(GithubAuthGuard)
  githubLogin() {
    // Guard redirects to GitHub OAuth page
  }

  @Get('oauth/github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = (req as any).user;
    const frontendUrl = this.config.get<string>('app.frontendUrl');
    res.redirect(
      `${frontendUrl}/oauth-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  // ─── Internal: token validation (called by gateway/services) ──────────────

  @Post('internal/validate-token')
  @HttpCode(HttpStatus.OK)
  validateToken(
    @Body() dto: ValidateTokenDto,
    @Headers('x-internal-api-key') apiKey: string,
  ) {
    const expectedKey = this.config.get<string>('app.internalApiKey');
    if (apiKey !== expectedKey) {
      return { valid: false };
    }
    return this.auth.validateToken(dto.token);
  }
}
