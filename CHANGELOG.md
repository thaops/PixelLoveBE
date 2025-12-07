# Changelog

All notable changes to Pixel Love Backend will be documented in this file.

## [0.0.1] - 2024-12-02

### Added
- Initial project setup with NestJS v11
- MongoDB integration with Mongoose
- JWT authentication system
- Google OAuth login integration
- Facebook OAuth login integration
- User management module
  - Get profile endpoint
  - Update profile endpoint
- Couple room management module
  - Create couple room with unique code
  - Join couple room using code
  - Get couple room information
- Pet system module
  - Get pet status (solo/couple mode)
  - Feed pet mechanism
  - Level up system (100 EXP per level)
- Memory management module
  - Upload images/videos to Cloudflare R2
  - List memories with pagination
  - Automatic pet feeding on upload
- Payment module with PayOS integration
  - Create payment link for coin purchase
  - Webhook handler for payment verification
  - Payment history endpoint
  - Coin pricing: 1 coin = 1,000 VND
- Notification module (placeholder for OneSignal)
- Common utilities
  - JWT guard for protected routes
  - User decorator for extracting authenticated user
  - Response interceptor for consistent API responses
  - HTTP exception filter
  - Code generator utility
  - File upload utilities
- Configuration files
  - MongoDB configuration
  - Cloudflare R2 configuration
  - PayOS configuration
  - JWT configuration
- Documentation
  - README.md with project overview
  - API_DOCUMENTATION.md with detailed API specs
  - DEPLOYMENT.md with deployment guides
  - Postman collection for API testing
  - .env.example with all required variables

### Database Schemas
- User schema with OAuth provider support
- CoupleRoom schema with pet and exp tracking
- Memory schema for uploaded media
- Payment schema for transaction tracking

### Security
- JWT token-based authentication
- OAuth token verification
- Input validation with class-validator
- CORS configuration
- Environment variable protection

### Technical Details
- TypeScript with strict mode
- ESLint and Prettier configuration
- Global validation pipe
- API prefix: /api
- Support for both solo and couple modes
- Cloudflare R2 for scalable file storage
- PayOS integration for Vietnamese market

## [Unreleased]

### Planned Features
- OneSignal push notification implementation
- Solo mode pet persistence
- Pet customization options
- Memory reactions and comments
- Couple achievements system
- Admin dashboard
- Swagger API documentation
- Comprehensive test coverage
- Rate limiting
- Caching layer with Redis
- Background job processing
- Email notifications
- Social sharing features
- Pet evolution system
- Premium features with coins

