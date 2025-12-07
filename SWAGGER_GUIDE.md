# 📚 Swagger API Documentation Guide

## 🎯 Overview

Swagger UI đã được tích hợp vào Pixel Love Backend để test và xem tất cả API endpoints.

---

## 🚀 Truy cập Swagger UI

Sau khi start server, truy cập:

```
http://localhost:3000/api/docs
```

---

## 📋 Các tính năng Swagger

### 1. **Xem tất cả API endpoints**
- Tất cả endpoints được nhóm theo tags (Auth, User, Couple, Pet, Album, Home, Cloudinary)
- Mỗi endpoint có mô tả chi tiết về input/output

### 2. **Test API trực tiếp**
- Click vào endpoint → "Try it out"
- Điền thông tin → "Execute"
- Xem response ngay trong Swagger UI

### 3. **JWT Authentication**
- Click nút **"Authorize"** ở góc trên bên phải
- Nhập JWT token: `Bearer {your-token}`
- Token sẽ được lưu và dùng cho tất cả requests (nhờ `persistAuthorization: true`)

---

## 🔥 API Endpoints trong Swagger

### **Auth** (Không cần JWT)
- `POST /api/auth/google` - Login với Google ID Token

### **User** (Cần JWT)
- `GET /api/users/me` - Lấy profile hiện tại
- `PUT /api/users/:userId` - Cập nhật profile

### **Couple** (Cần JWT)
- `POST /api/couple/create-code` - Tạo mã ghép đôi
- `POST /api/couple/pair` - Ghép đôi bằng mã
- `GET /api/couple/info` - Lấy thông tin couple
- `POST /api/couple/set-love-date` - Đặt ngày yêu
- `GET /api/couple/love` - Lấy ngày yêu và số ngày bên nhau

### **Pet** (Cần JWT)
- `GET /api/pet/status` - Lấy trạng thái pet
- `POST /api/pet/feed` - Cho pet ăn

### **Album** (Cần JWT)
- `POST /api/album/add` - Thêm ảnh (URL)
- `GET /api/album/list` - List ảnh

### **Home** (Cần JWT)
- `GET /api/home` - Lấy cảnh nhà ảo

### **Cloudinary** (Public + JWT)
- `GET /api/cloudinary/signature` - Lấy signature để upload trực tiếp
- `POST /api/cloudinary/upload` ⭐ **NEW!** - Upload ảnh/GIF lên Cloudinary

---

## 📤 Upload Ảnh/GIF qua Swagger

### Cách 1: Upload trực tiếp qua Backend (NEW!)

**Endpoint:** `POST /api/cloudinary/upload`

**Bước 1:** Đăng nhập để lấy JWT token
```
POST /api/auth/google
Body: { "idToken": "your-google-id-token" }
→ Copy accessToken từ response
```

**Bước 2:** Authorize trong Swagger
- Click "Authorize" button
- Nhập: `Bearer {accessToken}`
- Click "Authorize"

**Bước 3:** Upload file
- Vào `POST /api/cloudinary/upload`
- Click "Try it out"
- Chọn file trong "file" field (jpg, png, gif, webp, mp4, mov)
- Click "Execute"
- Response sẽ có `secure_url` - dùng URL này để add vào album

**Bước 4:** Add vào album
```
POST /api/album/add
Body: { "imageUrl": "{secure_url từ bước 3}" }
```

### Cách 2: Upload trực tiếp từ Client (Recommended)

**Bước 1:** Lấy signature
```
GET /api/cloudinary/signature
→ Response có timestamp, signature, cloudName, apiKey, uploadPreset
```

**Bước 2:** Client upload trực tiếp lên Cloudinary
- Sử dụng Cloudinary SDK hoặc form upload
- Dùng các thông tin từ bước 1

**Bước 3:** Add URL vào album
```
POST /api/album/add
Body: { "imageUrl": "{secure_url từ Cloudinary}" }
```

---

## 🎨 Swagger UI Features

### 1. **Request/Response Examples**
- Mỗi endpoint có ví dụ request/response
- Schema được định nghĩa rõ ràng

### 2. **Try it out**
- Test API ngay trong browser
- Không cần Postman hay tool khác

### 3. **Authentication**
- JWT token được lưu tự động
- Dùng cho tất cả protected endpoints

### 4. **Error Responses**
- Tất cả error codes được document
- 400, 401, 403, 404, 500

---

## 📝 Example: Upload ảnh qua Swagger

### Step 1: Login
```json
POST /api/auth/google
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij..."
}
```

**Response:**
```json
{
  "userId": "u_23871",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...
}
```

### Step 2: Authorize
- Copy `accessToken`
- Click "Authorize" → Nhập: `Bearer {accessToken}`

### Step 3: Upload
```
POST /api/cloudinary/upload
- Chọn file: my-photo.jpg
- Execute
```

**Response:**
```json
{
  "public_id": "pixellove/abc123",
  "secure_url": "https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "bytes": 123456
}
```

### Step 4: Add to Album
```json
POST /api/album/add
{
  "imageUrl": "https://res.cloudinary.com/dukoun1pb/image/upload/v123/abc123.jpg"
}
```

**Response:**
```json
{
  "photoId": "p_993",
  "createdDate": "2025-12-06T10:30:00Z"
}
```

---

## 🔧 Configuration

Swagger được config trong `src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('Pixel Love API')
  .setDescription('API documentation for Pixel Love Backend')
  .setVersion('1.0')
  .addBearerAuth(..., 'JWT-auth')
  .build();
```

---

## ⚠️ Lưu ý

1. **File Upload Limit:** Max 10MB
2. **Allowed Formats:** jpg, jpeg, png, gif, webp, mp4, mov
3. **JWT Token:** Cần login trước khi test protected endpoints
4. **CORS:** Đảm bảo CORS được enable cho frontend

---

## 🎉 Benefits

✅ **No Postman needed** - Test API trực tiếp trong browser  
✅ **Auto documentation** - Code changes tự động update docs  
✅ **Easy testing** - Click và test, không cần code  
✅ **JWT support** - Token được lưu tự động  
✅ **File upload** - Upload ảnh/GIF trực tiếp qua Swagger  

---

**Happy Testing! 🚀**

