import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt.payload';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    //load token from .env file
    const jwtSecret = process.env.JWT_SECRET;
    super({
      //extract token from request header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      //reject expired tokens
      ignoreExpiration: false,
      //use secret key from .env file
      secretOrKey: jwtSecret as string,
    });
  }
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}
