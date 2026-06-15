import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get<string>('app.oauth.google.clientId') || 'placeholder',
      clientSecret: config.get<string>('app.oauth.google.clientSecret') || 'placeholder',
      callbackURL: config.get<string>('app.oauth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    const email = profile.emails?.[0]?.value;
    const fullName = profile.displayName ?? `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim();

    if (!email) {
      throw new Error('Google OAuth profile missing email');
    }

    return this.authService.oauthLogin({
      email,
      fullName,
      oauthProvider: 'google',
      oauthId: profile.id,
    });
  }
}
