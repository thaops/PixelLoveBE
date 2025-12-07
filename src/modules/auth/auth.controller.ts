import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Auth Controller
 * Handles authentication endpoints
 * Note: Auth endpoints do NOT require JWT Bearer token - they are public endpoints
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/google
   * Login with Google ID token
   * 
   * ⚠️ IMPORTANT: This is a PUBLIC endpoint - does NOT require JWT Bearer token.
   * 
   * 📝 How to test on Swagger:
   * 1. Click "Authorize" button and REMOVE any JWT Bearer token (if exists)
   * 2. Get a REAL Google ID Token from Flutter app:
   *    - final GoogleSignInAccount? googleUser = await GoogleSignIn().signIn();
   *    - final googleAuth = await googleUser?.authentication;
   *    - final idToken = googleAuth?.idToken;
   * 3. Copy the idToken and paste it in the request body
   * 4. Execute the request
   * 
   * ❌ DO NOT use:
   * - JWT Bearer token from previous authorization
   * - Tokens copied from JWT decode websites
   * - Expired or invalid tokens
   * 
   * ✅ The Google ID Token must be:
   * - Issued by accounts.google.com
   * - Valid and not expired
   * - From your configured Google Client ID
   */
  @Post('google')
  @ApiOperation({ 
    summary: 'Login with Google ID Token (Public Endpoint)',
    description: `⚠️ PUBLIC ENDPOINT - Does NOT require JWT Bearer token!

📝 Testing Instructions:
1. Remove JWT Bearer token from Authorization (click "Authorize" → Remove)
2. Get REAL Google ID Token from Flutter app
3. Send the Google ID Token in request body (idToken field)

❌ Do NOT use:
- JWT Bearer token in Authorization header
- Tokens from JWT decode websites
- Expired or invalid tokens

✅ Google ID Token must be:
- Fresh token from Google Sign-In SDK
- Valid and not expired
- From your configured Google Client ID`
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Send Google ID Token (from Flutter Google Sign-In SDK) in idToken field'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - returns user profile and JWT access token',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'u_23871' },
        email: { type: 'string', example: 'abc@gmail.com' },
        displayName: { type: 'string', example: 'Thao' },
        gender: { type: 'string', example: 'male' },
        birthDate: { type: 'string', example: '1999-02-14' },
        avatarUrl: { type: 'string', example: 'https://...' },
        coupleId: { type: 'string', example: 'c_88991' },
        accessToken: { type: 'string', example: 'jwt-token', description: 'JWT token for subsequent API calls' },
        isPaired: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid Google token - token may be expired, invalid signature, or wrong client ID' 
  })
  async loginGoogle(@Body() loginDto: LoginDto) {
    return this.authService.loginWithGoogle(loginDto.idToken);
  }
}

