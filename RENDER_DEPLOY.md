# 🚀 Hướng dẫn Deploy lên Render

## ⚠️ QUAN TRỌNG - Phải làm đúng các bước này

### 1️⃣ **Start Command** (BẮT BUỘC)

Trên Render Dashboard → Settings → Start Command:

```
node dist/main.js
```

❌ **KHÔNG dùng:**
- `npm run start` (sẽ chạy `nest start` → dev mode → OOM)
- `nest start` (tốn RAM quá nhiều)
- `ts-node` (không cần trong production)

### 2️⃣ **Build Command**

```
npm run build
```

### 3️⃣ **Environment Variables** (QUAN TRỌNG)

Thêm vào Render → Environment:

```
NODE_OPTIONS=--max-old-space-size=180
NODE_ENV=production
```

**Lý do:**
- Render free tier có ~512MB RAM
- `nest start` (dev mode) tốn ~300-400MB
- `node dist/main.js` (production) chỉ tốn ~150-200MB
- Set `--max-old-space-size=180` để tránh OOM

### 4️⃣ **Port Binding**

Code đã tự động dùng `process.env.PORT` từ Render:

```typescript
const port = process.env.PORT || 3000;
await app.listen(port);
```

✅ **Không cần config thêm gì**

---

## 📋 Checklist Deploy

- [ ] Build Command: `npm run build`
- [ ] Start Command: `node dist/main.js`
- [ ] Environment: `NODE_OPTIONS=--max-old-space-size=180`
- [ ] Environment: `NODE_ENV=production`
- [ ] Environment: Các biến khác (MONGO_URI, JWT_SECRET, etc.)

---

## 🧪 Test Local giống Render

```bash
# Build
npm run build

# Chạy với giới hạn RAM giống Render
NODE_OPTIONS=--max-old-space-size=180 node dist/main.js
```

Nếu local chạy được → deploy trên Render sẽ OK ✅

---

## ❌ Lỗi thường gặp

### 1. "No open ports detected"
- **Nguyên nhân**: Đang dùng `nest start` (dev mode không bind PORT đúng)
- **Fix**: Đổi Start Command → `node dist/main.js`

### 2. "JavaScript heap out of memory"
- **Nguyên nhân**: Không set `NODE_OPTIONS` hoặc dùng `nest start`
- **Fix**: 
  - Set `NODE_OPTIONS=--max-old-space-size=180`
  - Đổi Start Command → `node dist/main.js`

### 3. "Cannot find module"
- **Nguyên nhân**: Chưa build hoặc build fail
- **Fix**: Kiểm tra Build Command → `npm run build`

---

## 📝 File `render.yaml` (Optional)

Nếu dùng file `render.yaml`, Render sẽ tự động dùng config:

```yaml
services:
  - type: web
    name: pixel-love-backend
    buildCommand: npm run build
    startCommand: node dist/main.js
    envVars:
      - key: NODE_OPTIONS
        value: --max-old-space-size=180
```

---

## ✅ Sau khi deploy thành công

- API: `https://your-app.onrender.com/api`
- Swagger: `https://your-app.onrender.com/api/docs`
- WebSocket: `wss://your-app.onrender.com/events`

