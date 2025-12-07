# Quick Start Guide - Pixel Love Backend

Get your Pixel Love backend up and running in 5 minutes! 🚀

## Prerequisites

- Node.js 20+ installed
- MongoDB running (local or cloud)
- Git installed

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd pixel-love-backend

# Install dependencies
npm install
```

## Step 2: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

**Minimum required configuration:**

```env
# MongoDB (use local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/pixel-love

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-key-change-this

# Server
PORT=3000
```

**For full features, also configure:**
- Cloudflare R2 credentials (for file uploads)
- PayOS credentials (for payments)
- OneSignal credentials (for notifications)

## Step 3: Start Development Server (1 minute)

```bash
# Start in watch mode
npm run start:dev
```

You should see:
```
🚀 Pixel Love Backend is running on: http://localhost:3000/api
```

## Step 4: Test the API

### Option A: Using cURL

```bash
# Test health endpoint
curl http://localhost:3000/api

# Should return: {"success":true,"data":"Hello World!"}
```

### Option B: Using Postman

1. Import `postman_collection.json`
2. Set `baseUrl` to `http://localhost:3000/api`
3. Test endpoints

### Option C: Using Browser

Visit: `http://localhost:3000/api`

## Quick Test Flow

### 1. Login (Simulate OAuth)

For testing without real OAuth tokens, you can temporarily modify the auth service or use this test flow:

```bash
# POST /auth/google
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "accessToken": "test-token"
  }'
```

**Note:** This will fail without a valid Google token. For development:
- Use real OAuth tokens from Google/Facebook
- Or implement a test/dev mode in auth service

### 2. Get User Profile

```bash
# GET /user/me (requires JWT token)
curl http://localhost:3000/api/user/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Create Couple Room

```bash
# POST /couple/create
curl -X POST http://localhost:3000/api/couple/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"petType": "cat"}'
```

### 4. Get Pet Status

```bash
# GET /pet/status
curl http://localhost:3000/api/pet/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues & Solutions

### Issue: MongoDB Connection Failed

**Solution:**
```bash
# Install MongoDB locally
# macOS
brew install mongodb-community

# Ubuntu
sudo apt install mongodb

# Or use MongoDB Atlas (cloud)
# Get connection string from: https://cloud.mongodb.com
```

### Issue: Port 3000 Already in Use

**Solution:**
```bash
# Change PORT in .env file
PORT=3001
```

### Issue: Module Not Found

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript Errors

**Solution:**
```bash
# Rebuild the project
npm run build
```

## Development Workflow

### 1. Watch Mode (Auto-reload)
```bash
npm run start:dev
```

### 2. Debug Mode
```bash
npm run start:debug
```

### 3. Run Tests
```bash
npm run test
```

### 4. Lint Code
```bash
npm run lint
```

### 5. Format Code
```bash
npm run format
```

## Project Structure Overview

```
src/
├── modules/          # Feature modules
│   ├── auth/        # Authentication
│   ├── user/        # User management
│   ├── couple/      # Couple rooms
│   ├── pet/         # Pet mechanics
│   ├── memory/      # Memory uploads
│   └── payment/     # Payments
├── config/          # Configuration files
├── common/          # Shared utilities
└── main.ts          # Entry point
```

## API Endpoints Quick Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/google` | Login with Google | ❌ |
| POST | `/auth/facebook` | Login with Facebook | ❌ |
| GET | `/user/me` | Get profile | ✅ |
| PUT | `/user/update` | Update profile | ✅ |
| POST | `/couple/create` | Create room | ✅ |
| POST | `/couple/join` | Join room | ✅ |
| GET | `/couple/info` | Room info | ✅ |
| GET | `/pet/status` | Pet status | ✅ |
| POST | `/pet/feed` | Feed pet | ✅ |
| POST | `/memory/upload` | Upload memory | ✅ |
| GET | `/memory/list` | List memories | ✅ |
| POST | `/payment/create` | Create payment | ✅ |
| GET | `/payment/history` | Payment history | ✅ |

## Environment Variables Cheat Sheet

### Essential
```env
MONGODB_URI=mongodb://localhost:27017/pixel-love
JWT_SECRET=your-secret-key
PORT=3000
```

### OAuth (for production)
```env
# Get from Google Cloud Console
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Get from Facebook Developers
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

### File Storage (Cloudflare R2)
```env
R2_ENDPOINT=https://...r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=pixel-love-memories
R2_PUBLIC_URL=https://...
```

### Payment (PayOS)
```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
```

## Next Steps

1. ✅ Backend running locally
2. 📖 Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API specs
3. 🏗️ Read [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) to understand the codebase
4. 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) when ready to deploy
5. 🔧 Start building your frontend!

## Getting Help

- Check [README.md](./README.md) for detailed information
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- Check [CHANGELOG.md](./CHANGELOG.md) for version history

## Development Tips

### Hot Reload
Changes to `.ts` files automatically reload the server in dev mode.

### Database GUI
Use MongoDB Compass to view your database:
```
mongodb://localhost:27017
```

### API Testing
Import `postman_collection.json` into Postman for easy testing.

### Code Quality
Run before committing:
```bash
npm run lint
npm run format
npm run test
```

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure real MongoDB connection
- [ ] Set up Cloudflare R2 bucket
- [ ] Configure PayOS credentials
- [ ] Set up proper CORS origins
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security settings

---

**Happy Coding! 🎉**

Need help? Check the documentation or open an issue.

