# Pixel Love Backend

Backend API cho ứng dụng **Pixel Love** - nền tảng quản lý kỷ niệm và pet ảo cho cặp đôi.

## 🚀 Tech Stack

- **NestJS v11** - Progressive Node.js framework
- **MongoDB + Mongoose** - NoSQL database
- **JWT Authentication** - Secure token-based auth
- **Google & Facebook OAuth** - Social login
- **Cloudflare R2** - Object storage for images/videos
- **PayOS** - Vietnamese payment gateway
- **OneSignal** - Push notifications (placeholder)

## 📁 Project Structure

```
src/
├── config/                 # Configuration files
│   ├── mongo.config.ts
│   ├── cloudflare.config.ts
│   ├── payos.config.ts
│   └── jwt.config.ts
├── common/                 # Shared utilities
│   ├── guards/            # Auth guards
│   ├── decorators/        # Custom decorators
│   └── interceptors/      # Response interceptors
├── modules/               # Feature modules
│   ├── auth/             # Authentication
│   ├── user/             # User management
│   ├── couple/           # Couple room management
│   ├── pet/              # Pet mechanics
│   ├── memory/           # Memory uploads
│   ├── payment/          # Payment & coins
│   └── notification/     # Push notifications
└── shared/               # Shared utilities
    └── utils/
```

## 🛠️ Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd pixel-love-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your credentials:
- MongoDB connection string
- JWT secret key
- Cloudflare R2 credentials
- PayOS API keys
- OneSignal credentials

4. **Run the application**

Development mode:
```bash
npm run start:dev
```

Production mode:
```bash
npm run build
npm run start:prod
```

## 📡 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication
- `POST /auth/google` - Login with Google OAuth token
- `POST /auth/facebook` - Login with Facebook OAuth token

### User
- `GET /user/me` - Get current user profile (🔒 Protected)
- `PUT /user/update` - Update user profile (🔒 Protected)

### Couple
- `POST /couple/create` - Create couple room (🔒 Protected)
- `POST /couple/join` - Join couple room with code (🔒 Protected)
- `GET /couple/info` - Get couple room info (🔒 Protected)

### Pet
- `GET /pet/status` - Get pet status (🔒 Protected)
- `POST /pet/feed` - Feed pet (🔒 Protected)

### Memory
- `POST /memory/upload` - Upload image/video (🔒 Protected)
- `GET /memory/list` - List memories (🔒 Protected)

### Payment
- `POST /payment/create` - Create payment link (🔒 Protected)
- `POST /payment/webhook` - PayOS webhook (Public)
- `GET /payment/history` - Get payment history (🔒 Protected)

## 🔐 Authentication Flow

1. Client obtains OAuth token from Google/Facebook
2. Client sends token to `/auth/google` or `/auth/facebook`
3. Backend verifies token with OAuth provider
4. Backend creates/finds user in database
5. Backend returns JWT token
6. Client uses JWT token in `Authorization: Bearer <token>` header

## 💾 Database Schemas

### User
- provider: 'google' | 'facebook'
- providerId: string
- name: string
- avatar: string
- mode: 'solo' | 'couple'
- coupleRoomId: string | null
- coins: number

### CoupleRoom
- code: string (6 chars)
- members: string[] (user IDs)
- petLevel: number
- exp: number
- petType: string

### Memory
- coupleRoomId: string
- userId: string
- type: 'image' | 'video'
- url: string
- note: string
- expGained: number

### Payment
- userId: string
- amount: number
- coins: number
- status: 'pending' | 'success' | 'failed'
- transactionId: string
- paymentUrl: string

## 🎮 Game Mechanics

### Pet System
- Each couple room has a shared pet
- Upload memories → gain EXP
- 100 EXP = 1 level up
- Solo mode: individual pet (basic implementation)

### Coin System
- 1 coin = 1,000 VND
- Purchase via PayOS payment gateway
- Used for premium features (future)

## 🔧 Development

Run tests:
```bash
npm run test
```

Run e2e tests:
```bash
npm run test:e2e
```

Lint code:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

**Important:**
- Never commit `.env` file
- Change `JWT_SECRET` in production
- Use secure credentials for all services

## 🚢 Deployment

1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure Cloudflare R2 bucket
3. Set up PayOS merchant account
4. Configure OneSignal app
5. Set all environment variables
6. Deploy to your hosting service (Heroku, AWS, DigitalOcean, etc.)

## 📚 Next Steps

- [ ] Implement OneSignal push notifications
- [ ] Add solo mode pet persistence
- [ ] Implement pet customization
- [ ] Add memory reactions/comments
- [ ] Implement couple achievements
- [ ] Add admin dashboard
- [ ] Write comprehensive tests
- [ ] Add API documentation (Swagger)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Support

For support, email: support@pixellove.com

---

Built with ❤️ using NestJS
