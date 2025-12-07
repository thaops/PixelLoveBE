# MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Start)

### Bước 1: Tạo tài khoản MongoDB Atlas
1. Truy cập: https://www.mongodb.com/cloud/atlas/register
2. Đăng ký tài khoản miễn phí

### Bước 2: Tạo Cluster
1. Chọn **FREE** tier (M0 Sandbox)
2. Chọn region gần nhất (Singapore hoặc Tokyo)
3. Click **Create Cluster**

### Bước 3: Tạo Database User
1. Vào **Database Access** → **Add New Database User**
2. Chọn **Password** authentication
3. Username: `pixellove`
4. Password: Tạo password mạnh (lưu lại)
5. Database User Privileges: **Read and write to any database**
6. Click **Add User**

### Bước 4: Whitelist IP
1. Vào **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (0.0.0.0/0)
3. Click **Confirm**

### Bước 5: Lấy Connection String
1. Vào **Database** → Click **Connect**
2. Chọn **Connect your application**
3. Copy connection string:
   ```
   mongodb+srv://pixellove:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Thay `<password>` bằng password thực tế
5. Thêm database name vào cuối: `/pixel-love`

### Bước 6: Cập nhật .env
```env
MONGODB_URI=mongodb+srv://pixellove:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/pixel-love?retryWrites=true&w=majority
```

---

## Option 2: MongoDB Local (Windows)

### Bước 1: Download MongoDB
1. Truy cập: https://www.mongodb.com/try/download/community
2. Chọn version mới nhất cho Windows
3. Download và cài đặt

### Bước 2: Cài đặt MongoDB
1. Chạy file installer
2. Chọn **Complete** installation
3. Chọn **Install MongoDB as a Service**
4. Để mặc định data directory: `C:\Program Files\MongoDB\Server\7.0\data`
5. Click **Install**

### Bước 3: Kiểm tra MongoDB đang chạy
```powershell
# Mở PowerShell và chạy:
Get-Service MongoDB

# Nếu chưa chạy, start service:
Start-Service MongoDB
```

### Bước 4: Cập nhật .env
```env
MONGODB_URI=mongodb://localhost:27017/pixel-love
```

---

## Option 3: MongoDB Docker

### Bước 1: Cài Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Cài đặt và khởi động Docker Desktop

### Bước 2: Chạy MongoDB Container
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
```

### Bước 3: Cập nhật .env
```env
MONGODB_URI=mongodb://admin:password@localhost:27017/pixel-love?authSource=admin
```

---

## Kiểm tra kết nối

### Sử dụng MongoDB Compass (GUI)
1. Download: https://www.mongodb.com/try/download/compass
2. Cài đặt và mở
3. Paste connection string vào
4. Click **Connect**

### Sử dụng mongosh (CLI)
```bash
# Kết nối local
mongosh "mongodb://localhost:27017/pixel-love"

# Kết nối Atlas
mongosh "mongodb+srv://username:password@cluster.mongodb.net/pixel-love"
```

---

## Sau khi kết nối thành công

### 1. Restart Backend Server
```bash
# Stop server (Ctrl+C)
# Start lại:
npm run start:dev
```

### 2. Kiểm tra logs
Bạn sẽ thấy:
```
[Nest] LOG [InstanceLoader] MongooseModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started
🚀 Pixel Love Backend is running on: http://localhost:3000/api
```

### 3. Test API
```bash
# Test health endpoint
curl http://localhost:3000/api

# Hoặc mở browser:
http://localhost:3000/api
```

---

## Troubleshooting

### Lỗi: "Unable to connect to the database"
- Kiểm tra MongoDB service đang chạy
- Kiểm tra connection string trong `.env`
- Kiểm tra firewall/network access

### Lỗi: "Authentication failed"
- Kiểm tra username/password
- Kiểm tra database user đã được tạo

### Lỗi: "Connection timeout"
- Kiểm tra IP đã được whitelist (Atlas)
- Kiểm tra network connection
- Thử đổi region gần hơn

---

## Recommended: MongoDB Atlas Free Tier

**Ưu điểm:**
- ✅ Miễn phí vĩnh viễn
- ✅ 512MB storage
- ✅ Không cần cài đặt local
- ✅ Backup tự động
- ✅ Monitoring dashboard
- ✅ Có thể access từ mọi nơi

**Nhược điểm:**
- ❌ Cần internet
- ❌ Giới hạn 512MB

---

## Next Steps

Sau khi MongoDB đã kết nối thành công:

1. ✅ Backend đang chạy
2. 📖 Đọc `API_DOCUMENTATION.md` để test API
3. 📮 Import `postman_collection.json` để test endpoints
4. 🔐 Cấu hình OAuth credentials (Google/Facebook)
5. ☁️ Cấu hình Cloudflare R2 (cho upload ảnh/video)
6. 💳 Cấu hình PayOS (cho thanh toán)

**Chúc bạn code vui vẻ! 🚀**

