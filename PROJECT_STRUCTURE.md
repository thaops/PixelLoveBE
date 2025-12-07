# Pixel Love Backend - Project Structure

## 📁 Complete Directory Structure

```
pixel-love-backend/
├── src/
│   ├── config/                          # Configuration files
│   │   ├── mongo.config.ts             # MongoDB connection config
│   │   ├── cloudflare.config.ts        # Cloudflare R2 config
│   │   ├── payos.config.ts             # PayOS payment config
│   │   └── jwt.config.ts               # JWT authentication config
│   │
│   ├── common/                          # Shared common utilities
│   │   ├── guards/
│   │   │   └── jwt.guard.ts            # JWT authentication guard
│   │   ├── decorators/
│   │   │   └── user.decorator.ts       # Current user decorator
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts # Response formatting
│   │   └── filters/
│   │       └── http-exception.filter.ts # Exception handling
│   │
│   ├── modules/                         # Feature modules
│   │   ├── auth/                       # Authentication module
│   │   │   ├── dto/
│   │   │   │   └── login.dto.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   └── jwt.strategy.ts
│   │   │
│   │   ├── user/                       # User management module
│   │   │   ├── dto/
│   │   │   │   └── update-user.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── user.schema.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.module.ts
│   │   │
│   │   ├── couple/                     # Couple room module
│   │   │   ├── dto/
│   │   │   │   ├── create-couple.dto.ts
│   │   │   │   └── join-couple.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── couple-room.schema.ts
│   │   │   ├── couple.controller.ts
│   │   │   ├── couple.service.ts
│   │   │   └── couple.module.ts
│   │   │
│   │   ├── pet/                        # Pet mechanics module
│   │   │   ├── dto/
│   │   │   │   └── feed-pet.dto.ts
│   │   │   ├── pet.controller.ts
│   │   │   ├── pet.service.ts
│   │   │   └── pet.module.ts
│   │   │
│   │   ├── memory/                     # Memory upload module
│   │   │   ├── dto/
│   │   │   │   └── upload-memory.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── memory.schema.ts
│   │   │   ├── memory.controller.ts
│   │   │   ├── memory.service.ts
│   │   │   └── memory.module.ts
│   │   │
│   │   ├── payment/                    # Payment module
│   │   │   ├── dto/
│   │   │   │   ├── create-payment.dto.ts
│   │   │   │   └── webhook-payment.dto.ts
│   │   │   ├── schemas/
│   │   │   │   └── payment.schema.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   └── payment.module.ts
│   │   │
│   │   └── notification/               # Notification module
│   │       ├── notification.service.ts
│   │       └── notification.module.ts
│   │
│   ├── shared/                          # Shared utilities
│   │   └── utils/
│   │       ├── code-generator.util.ts  # Generate room codes
│   │       └── file-upload.util.ts     # File validation
│   │
│   ├── main.ts                          # Application entry point
│   ├── app.module.ts                    # Root module
│   ├── app.controller.ts                # Root controller
│   └── app.service.ts                   # Root service
│
├── test/                                # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── node_modules/                        # Dependencies
│
├── .env.example                         # Environment variables template
├── .gitignore                          # Git ignore rules
├── nest-cli.json                       # NestJS CLI config
├── package.json                        # NPM dependencies
├── package-lock.json                   # NPM lock file
├── tsconfig.json                       # TypeScript config
├── tsconfig.build.json                 # Build config
├── eslint.config.mjs                   # ESLint config
│
├── README.md                           # Project overview
├── API_DOCUMENTATION.md                # API endpoints documentation
├── DEPLOYMENT.md                       # Deployment guide
├── CHANGELOG.md                        # Version history
├── PROJECT_STRUCTURE.md                # This file
└── postman_collection.json             # Postman API collection
```

## 📦 Module Overview

### 1. Auth Module (`src/modules/auth/`)
**Purpose:** Handle user authentication via Google/Facebook OAuth

**Files:**
- `auth.controller.ts` - Login endpoints
- `auth.service.ts` - OAuth token verification, JWT generation
- `jwt.strategy.ts` - Passport JWT strategy
- `auth.module.ts` - Module configuration
- `dto/login.dto.ts` - Login request validation

**Endpoints:**
- `POST /auth/google` - Google OAuth login
- `POST /auth/facebook` - Facebook OAuth login

---

### 2. User Module (`src/modules/user/`)
**Purpose:** Manage user profiles and settings

**Files:**
- `user.controller.ts` - User endpoints
- `user.service.ts` - User business logic
- `user.module.ts` - Module configuration
- `schemas/user.schema.ts` - MongoDB user schema
- `dto/update-user.dto.ts` - Update profile validation

**Endpoints:**
- `GET /user/me` - Get current user profile
- `PUT /user/update` - Update user profile

**Schema Fields:**
- provider, providerId, name, avatar
- mode (solo/couple), coupleRoomId, coins

---

### 3. Couple Module (`src/modules/couple/`)
**Purpose:** Manage couple rooms and relationships

**Files:**
- `couple.controller.ts` - Couple room endpoints
- `couple.service.ts` - Room creation, joining logic
- `couple.module.ts` - Module configuration
- `schemas/couple-room.schema.ts` - MongoDB couple room schema
- `dto/create-couple.dto.ts` - Create room validation
- `dto/join-couple.dto.ts` - Join room validation

**Endpoints:**
- `POST /couple/create` - Create new couple room
- `POST /couple/join` - Join existing room
- `GET /couple/info` - Get room information

**Schema Fields:**
- code (6-char unique), members[], petLevel, exp, petType

---

### 4. Pet Module (`src/modules/pet/`)
**Purpose:** Handle pet mechanics and leveling

**Files:**
- `pet.controller.ts` - Pet endpoints
- `pet.service.ts` - Pet status, feeding logic
- `pet.module.ts` - Module configuration
- `dto/feed-pet.dto.ts` - Feed validation

**Endpoints:**
- `GET /pet/status` - Get pet status
- `POST /pet/feed` - Feed pet (gain exp)

**Logic:**
- 10 EXP per memory upload
- 100 EXP = 1 level up
- Works for both solo and couple modes

---

### 5. Memory Module (`src/modules/memory/`)
**Purpose:** Upload and manage memories (images/videos)

**Files:**
- `memory.controller.ts` - Memory endpoints
- `memory.service.ts` - Upload to R2, database storage
- `memory.module.ts` - Module configuration
- `schemas/memory.schema.ts` - MongoDB memory schema
- `dto/upload-memory.dto.ts` - Upload validation

**Endpoints:**
- `POST /memory/upload` - Upload image/video
- `GET /memory/list` - List memories with pagination

**Schema Fields:**
- coupleRoomId, userId, type, url, note, expGained

**Storage:**
- Cloudflare R2 (S3-compatible)
- Public URL generation

---

### 6. Payment Module (`src/modules/payment/`)
**Purpose:** Handle coin purchases via PayOS

**Files:**
- `payment.controller.ts` - Payment endpoints
- `payment.service.ts` - PayOS integration
- `payment.module.ts` - Module configuration
- `schemas/payment.schema.ts` - MongoDB payment schema
- `dto/create-payment.dto.ts` - Create payment validation
- `dto/webhook-payment.dto.ts` - Webhook validation

**Endpoints:**
- `POST /payment/create` - Create payment link
- `POST /payment/webhook` - PayOS webhook
- `GET /payment/history` - Payment history

**Schema Fields:**
- userId, amount, coins, status, transactionId, paymentUrl

**Pricing:**
- 1 coin = 1,000 VND

---

### 7. Notification Module (`src/modules/notification/`)
**Purpose:** Push notifications (OneSignal placeholder)

**Files:**
- `notification.service.ts` - Notification logic (placeholder)
- `notification.module.ts` - Module configuration

**Status:** Placeholder implementation, ready for OneSignal integration

---

## 🔧 Common Utilities

### Guards (`src/common/guards/`)
- `jwt.guard.ts` - Protects routes with JWT authentication

### Decorators (`src/common/decorators/`)
- `user.decorator.ts` - Extracts current user from request

### Interceptors (`src/common/interceptors/`)
- `response.interceptor.ts` - Standardizes API responses

### Filters (`src/common/filters/`)
- `http-exception.filter.ts` - Formats error responses

---

## 🛠️ Configuration Files

### `src/config/`
- `mongo.config.ts` - MongoDB connection settings
- `cloudflare.config.ts` - R2 client configuration
- `payos.config.ts` - PayOS API settings
- `jwt.config.ts` - JWT secret and expiration

---

## 📊 Database Schemas

### User Schema
```typescript
{
  provider: 'google' | 'facebook',
  providerId: string,
  name: string,
  avatar: string,
  mode: 'solo' | 'couple',
  coupleRoomId: string | null,
  coins: number,
  timestamps: true
}
```

### CoupleRoom Schema
```typescript
{
  code: string (unique, 6 chars),
  members: string[],
  petLevel: number,
  exp: number,
  petType: string,
  timestamps: true
}
```

### Memory Schema
```typescript
{
  coupleRoomId: string,
  userId: string,
  type: 'image' | 'video',
  url: string,
  note: string,
  expGained: number,
  timestamps: true
}
```

### Payment Schema
```typescript
{
  userId: string,
  amount: number,
  coins: number,
  status: 'pending' | 'success' | 'failed',
  transactionId: string (unique),
  paymentUrl: string,
  metadata: object,
  timestamps: true
}
```

---

## 🔐 Authentication Flow

1. Client obtains OAuth token from Google/Facebook
2. Client sends token to `/auth/google` or `/auth/facebook`
3. Backend verifies token with provider API
4. Backend finds or creates user in database
5. Backend generates JWT token
6. Client stores JWT token
7. Client includes JWT in `Authorization: Bearer <token>` header
8. `JwtAuthGuard` validates token on protected routes
9. `@CurrentUser()` decorator provides user object

---

## 🚀 Key Features

✅ OAuth authentication (Google & Facebook)
✅ JWT token-based authorization
✅ MongoDB with Mongoose ODM
✅ Cloudflare R2 file storage
✅ PayOS payment integration
✅ Pet leveling system
✅ Couple room management
✅ Memory feed with uploads
✅ Coin purchase system
✅ Input validation with DTOs
✅ Consistent API responses
✅ Error handling
✅ TypeScript strict mode
✅ ESLint + Prettier

---

## 📝 Next Steps

See `CHANGELOG.md` for planned features and improvements.

