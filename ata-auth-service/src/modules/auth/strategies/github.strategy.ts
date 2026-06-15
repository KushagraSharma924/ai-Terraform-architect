import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('app.oauth.github.clientId') || 'placeholder',
      clientSecret: config.get<string>('app.oauth.github.clientSecret') || 'placeholder',
      callbackURL: config.get<string>('app.oauth.github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email =
      profile.emails?.find((e: { value: string; primary?: boolean }) => e.primary)?.value ??
      profile.emails?.[0]?.value;
    const fullName = profile.displayName ?? profile.username ?? 'GitHub User';

    if (!email) {
      throw new Error('GitHub OAuth profile missing email. Ensure user:email scope is set.');
    }

    return this.authService.oauthLogin({
      email,
      fullName,
      oauthProvider: 'github',
      oauthId: String(profile.id),
    });
  }
}
