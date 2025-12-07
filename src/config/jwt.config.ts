import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * JWT Configuration Factory
 * Used for generating and validating JWT tokens
 */
export const getJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  return {
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '365d') as any,
    },
  };
};

