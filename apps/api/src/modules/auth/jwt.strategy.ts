import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@aria/contracts';
import { AuthUser } from './auth-user';

type JwtPayload = {
  sub: string;
  tenantId: string;
  email: string;
  username: string;
  fullName: string;
  roles: Role[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      username: payload.username ?? payload.email,
      fullName: payload.fullName,
      roles: payload.roles,
    };
  }
}
