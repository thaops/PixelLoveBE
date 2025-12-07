# Package.json Cleanup Guide

## ❌ Dependencies to Remove

Run this command to uninstall unused packages:

```bash
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @nestjs/platform-socket.io @nestjs/websockets @nestjs/schedule @socket.io/redis-adapter socket.io ioredis
```

### Detailed List:

1. **AWS SDK (Cloudflare R2 - replaced by Cloudinary)**
   - `@aws-sdk/client-s3`
   - `@aws-sdk/s3-request-presigner`

2. **WebSocket (Events module removed)**
   - `@nestjs/platform-socket.io`
   - `@nestjs/websockets`
   - `socket.io`

3. **Redis (Not needed)**
   - `@socket.io/redis-adapter`
   - `ioredis`

4. **Scheduler (Tasks/Cron removed)**
   - `@nestjs/schedule`

---

## ✅ Dependencies to Keep

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/mongoose": "^11.0.3",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.0.1",
    "axios": "^1.13.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "mongodb": "^7.0.0",
    "mongoose": "^8.20.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  }
}
```

---

## 📦 After Cleanup

Your final `package.json` dependencies should look like:

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.0.1",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/mongoose": "^11.0.3",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-express": "^11.0.1",
    "axios": "^1.13.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "mongodb": "^7.0.0",
    "mongoose": "^8.20.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  }
}
```

---

## 🚀 Steps to Clean Up

1. **Uninstall unused packages:**
   ```bash
   npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @nestjs/platform-socket.io @nestjs/websockets @nestjs/schedule @socket.io/redis-adapter socket.io ioredis
   ```

2. **Clean npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Reinstall dependencies:**
   ```bash
   npm install
   ```

4. **Rebuild the project:**
   ```bash
   npm run build
   ```

5. **Test the application:**
   ```bash
   npm run start:dev
   ```

---

## 📊 Before vs After

### Before:
- **Total dependencies:** 24 packages
- **Bundle size:** ~Large (includes WebSocket, Redis, AWS SDK)

### After:
- **Total dependencies:** 16 packages (✅ 33% reduction)
- **Bundle size:** ~Medium (lean and focused)

---

## ⚠️ Important Notes

- Make sure to commit your changes before running cleanup
- Test thoroughly after removing packages
- If you encounter any errors, check if any custom code still references the removed packages
- The devDependencies remain unchanged (no cleanup needed there)

