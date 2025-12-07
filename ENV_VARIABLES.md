# Environment Variables Guide

## ✅ Required Variables (Keep These)

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/pixellove

# JWT Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Cloudinary (for photo uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-upload-preset

# Server (optional, defaults to 3000)
PORT=3000
NODE_ENV=development
```

---

## ❌ Variables to Remove (No Longer Used)

```env
# Cloudflare R2 (replaced by Cloudinary)
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_ACCESS_KEY_ID=xxx
CLOUDFLARE_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET=xxx
CLOUDFLARE_R2_PUBLIC_URL=xxx

# PayOS (payment module removed)
PAYOS_CLIENT_ID=xxx
PAYOS_API_KEY=xxx
PAYOS_CHECKSUM_KEY=xxx

# Redis (not needed)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=xxx

# OneSignal (notification module removed)
ONESIGNAL_APP_ID=xxx
ONESIGNAL_REST_API_KEY=xxx

# WebSocket (events module removed)
SOCKET_IO_PORT=xxx
SOCKET_IO_CORS_ORIGIN=xxx
```

---

## 📝 Instructions

1. **Backup your current `.env`** file
2. **Remove all variables** listed in the "Variables to Remove" section
3. **Keep only** the required variables
4. **Update Cloudinary** credentials with your actual values
5. **Test the application** to ensure everything works

---

## 🔍 How to Get Cloudinary Credentials

1. Go to [cloudinary.com](https://cloudinary.com) and sign up/login
2. Navigate to **Dashboard**
3. Copy your:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
4. Create an **Upload Preset**:
   - Go to Settings → Upload
   - Scroll to "Upload presets"
   - Click "Add upload preset"
   - Set signing mode to "Unsigned" (for direct client uploads)
   - Copy the preset name

---

## ⚠️ Security Notes

- Never commit `.env` file to git
- Use strong random strings for `JWT_SECRET` in production
- Rotate secrets regularly
- Use environment-specific `.env` files (`.env.production`, `.env.staging`)

