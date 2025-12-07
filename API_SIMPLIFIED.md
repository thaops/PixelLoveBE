# 📘 Pixel Love API - Simplified Version

Tài liệu này mô tả API đơn giản hóa của Pixel Love Backend.

---

## 🔥 1. AUTH

### POST /auth/google
Đăng nhập bằng Google ID Token.

**Input:**
```json
{
  "idToken": "google-id-token"
}
```

**Output:**
```json
{
  "userId": "u_23871",
  "email": "abc@gmail.com",
  "displayName": "Thao",
  "gender": "male",
  "birthDate": "1999-02-14",
  "avatarUrl": "https://...",
  "coupleId": "c_88991",
  "accessToken": "jwt-token",
  "isPaired": true
}
```

---

## 🔥 2. USER

### PUT /users/:userId
Cập nhật thông tin người dùng.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Input:**
```json
{
  "displayName": "Thao",
  "gender": "male",
  "birthDate": "1999-02-14",
  "avatarUrl": "https://..."
}
```

**Output:**
```json
{
  "success": true
}
```

---

## 🔥 3. COUPLE

### POST /couple/create-code
Tạo mã ghép đôi.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
{
  "coupleCode": "XY3H56"
}
```

---

### POST /couple/pair
Ghép đôi bằng mã.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Input:**
```json
{
  "code": "XY3H56"
}
```

**Output:**
```json
{
  "coupleId": "c_88991",
  "partner": {
    "userId": "u_22381",
    "displayName": "Minh",
    "avatarUrl": "https://...",
    "gender": "female",
    "birthDate": "2000-05-10"
  }
}
```

---

### GET /couple/info
Lấy thông tin cặp đôi.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
{
  "coupleId": "c_88991",
  "userA": {
    "userId": "u_23871",
    "displayName": "Thao",
    "avatarUrl": "https://..."
  },
  "userB": {
    "userId": "u_22381",
    "displayName": "Minh",
    "avatarUrl": "https://..."
  },
  "loveStartDate": "2024-02-14",
  "createdDate": "2024-02-14T10:00:00Z"
}
```

---

### POST /couple/set-love-date
Đặt ngày bắt đầu yêu.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Input:**
```json
{
  "date": "2024-02-14"
}
```

**Output:**
```json
{
  "success": true
}
```

---

## 🔥 4. LOVE DATE

### GET /couple/love
Lấy thông tin ngày yêu và số ngày bên nhau.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
{
  "loveStartDate": "2024-02-14",
  "daysTogether": 123
}
```

---

## 🔥 5. PET

### GET /pet/status
Lấy trạng thái pet.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
{
  "level": 3,
  "exp": 260,
  "expToNextLevel": 500,
  "todayFeedCount": 6,
  "lastFeedTime": "2025-12-06T10:30:00Z"
}
```

---

### POST /pet/feed
Cho pet ăn (sau khi upload ảnh).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Input:**
```json
{
  "photoUrl": "https://res.cloudinary.com/xxx/image.jpg"
}
```

**Output:**
```json
{
  "expAdded": 10,
  "newExp": 270,
  "newLevel": 3
}
```

---

## 🔥 6. ALBUM

### POST /album/add
Thêm ảnh vào album (chỉ nhận URL từ Cloudinary).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Input:**
```json
{
  "imageUrl": "https://res.cloudinary.com/xxx/image.jpg"
}
```

**Output:**
```json
{
  "photoId": "p_993",
  "createdDate": "2025-12-06T10:30:00Z"
}
```

---

### GET /album/list
Lấy danh sách ảnh.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
[
  {
    "photoId": "p_993",
    "userId": "u_23871",
    "imageUrl": "https://...",
    "createdDate": "2025-12-06T10:30:00Z"
  },
  {
    "photoId": "p_994",
    "userId": "u_22381",
    "imageUrl": "https://...",
    "createdDate": "2025-12-06T11:00:00Z"
  }
]
```

---

## 🔥 7. HOME SCENE

### GET /home
Lấy cảnh nhà ảo (background + objects + pet status).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Output:**
```json
{
  "background": {
    "imageUrl": "https://.../bg.jpg",
    "width": 4096,
    "height": 1920
  },
  "objects": [
    {
      "id": "pet",
      "type": "pet",
      "imageUrl": "https://.../pet_lv3.png",
      "x": 1800,
      "y": 1200,
      "width": 500,
      "height": 500,
      "zIndex": 10
    },
    {
      "id": "fridge",
      "type": "fridge",
      "imageUrl": "https://.../fridge.png",
      "x": 3000,
      "y": 800,
      "width": 600,
      "height": 600,
      "zIndex": 5
    },
    {
      "id": "table",
      "type": "furniture",
      "imageUrl": "https://.../table.png",
      "x": 2400,
      "y": 1300,
      "width": 700,
      "height": 300,
      "zIndex": 3
    }
  ],
  "petStatus": {
    "level": 3,
    "exp": 270,
    "expToNextLevel": 500,
    "todayFeedCount": 6,
    "lastFeedTime": "2025-12-06T10:30:00Z"
  }
}
```

---

## ☁ 8. CLOUDINARY (Optional)

### GET /cloudinary/signature
Lấy chữ ký để upload trực tiếp lên Cloudinary từ client.

**Output:**
```json
{
  "timestamp": 1733470000,
  "signature": "a1b2c3...",
  "cloudName": "your-cloud",
  "apiKey": "123456",
  "uploadPreset": "app_upload"
}
```

---

## 🔥 GHI NHỚ QUAN TRỌNG

1. **Ảnh upload trực tiếp lên Cloudinary** - Client tự upload, backend chỉ nhận URL
2. **Backend chỉ nhận `secure_url`** - Không xử lý file upload
3. **Database chỉ lưu URL** - Không lưu binary/file
4. **JWT Required** - Tất cả endpoints (trừ `/auth/google`) cần `Authorization: Bearer {token}`

---

## 📦 Environment Variables

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/pixellove

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

---

## 🚀 Modules Structure

```
src/modules/
  ├── auth/       # Google OAuth login
  ├── user/       # User profile management
  ├── couple/     # Couple pairing & love date
  ├── pet/        # Pet level/exp/feed
  ├── album/      # Photo album (URL-based)
  └── home/       # Virtual home scene
```

---

## ✅ Removed Modules

- ❌ `events/` - WebSocket (không cần real-time)
- ❌ `memory/` - File upload to R2 (thay bằng Cloudinary)
- ❌ `payment/` - PayOS integration (không dùng)
- ❌ `notification/` - Push notifications (không dùng)
- ❌ `tasks/` - Cron jobs (không cần)

