import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        privateKey: config.get<string>('app.jwt.privateKey'),
        publicKey: config.get<string>('app.jwt.publicKey'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: config.get<number>('app.jwt.accessTokenTtl') ?? 900,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [TokenService],
  exports: [TokenService, JwtModule],
})
export class TokenModule {}
