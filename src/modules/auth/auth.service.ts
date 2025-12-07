import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { User, UserDocument } from '../user/schemas/user.schema';

/**
 * Auth Service
 * Handles Google ID token verification and JWT generation
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * Login with Google ID token
   * Verifies token, upserts user, returns JWT + profile
   */
  async loginWithGoogle(idToken: string) {
    const userInfo = await this.verifyGoogleToken(idToken);

    let user = await this.userModel.findOne({
      provider: 'google',
      providerId: userInfo.sub,
    });

    if (!user) {
      user = await this.userModel.create({
        provider: 'google',
        providerId: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name, // Lưu từ Google (backup)
        avatarUrl: userInfo.picture,
        gender: userInfo.gender || null,
        birthDate: userInfo.birthdate ? new Date(userInfo.birthdate) : null,
        mode: 'solo',
        coins: 0,
        isOnboarded: false, // Mới tạo = chưa onboard
        nickname: null, // Chưa có nickname
      });
    }

    const payload = { sub: user._id, provider: user.provider };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user._id,
        email: user.email,
        avatarUrl: user.avatarUrl,
        nickname: user.nickname || null,
        isOnboarded: user.isOnboarded || false,
        coupleId: user.coupleRoomId || null,
      },
      accessToken: token,
    };
  }

  /**
   * Verify Google OAuth token
   */
  private async verifyGoogleToken(idToken: string) {
    // Validate token format first
    if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
      this.logger.warn('Google token is empty or invalid format');
      throw new UnauthorizedException('Google ID token is required');
    }

    // Basic JWT format validation (should have 3 parts separated by dots)
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      this.logger.warn('Google token does not have valid JWT format');
      throw new UnauthorizedException('Invalid Google token format');
    }

    try {
      // Decode token to check expiration before calling API
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          this.logger.warn(`Google token expired at ${new Date(payload.exp * 1000).toISOString()}`);
          throw new UnauthorizedException('Google token has expired');
        }
        this.logger.debug(`Token issued by: ${payload.iss}, audience: ${payload.aud}`);
      } catch (decodeError) {
        this.logger.warn('Failed to decode Google token payload');
        // Continue to API verification anyway
      }

      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
        {
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        },
      );
      
      // Check if Google API returned an error
      if (response.data.error) {
        this.logger.error(
          `Google API error: ${response.data.error} - ${response.data.error_description || 'No description'}`,
        );
        throw new UnauthorizedException(
          `Google token verification failed: ${response.data.error_description || response.data.error}`,
        );
      }

      // Check if token is expired (double check from API response)
      if (response.data.exp && response.data.exp * 1000 < Date.now()) {
        this.logger.warn('Google token has expired (from API response)');
        throw new UnauthorizedException('Google token has expired');
      }

      // Validate required fields
      if (!response.data.sub || !response.data.email) {
        this.logger.warn('Google token missing required fields', { data: response.data });
        throw new UnauthorizedException('Invalid Google token: missing required fields');
      }

      // Validate issuer
      if (response.data.iss !== 'https://accounts.google.com' && response.data.iss !== 'accounts.google.com') {
        this.logger.warn(`Invalid issuer: ${response.data.iss}`);
        throw new UnauthorizedException('Invalid Google token: wrong issuer');
      }

      this.logger.debug(`Google token verified successfully for user: ${response.data.email}`);
      return response.data;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Log detailed error for debugging
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error_description || errorData?.error || error.message;
        
        this.logger.error(
          `Google token verification failed: HTTP ${status} - ${errorMessage}`,
          { 
            status,
            error: errorData?.error,
            errorDescription: errorData?.error_description,
            url: error.config?.url,
          },
        );
        
        throw new UnauthorizedException(
          `Google token verification failed: ${errorMessage}`,
        );
      }
      
      this.logger.error(`Unexpected error verifying Google token: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}

