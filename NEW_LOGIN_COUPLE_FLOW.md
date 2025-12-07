# 🔐 New Login & Couple Flow Documentation

## 📋 Overview
Hệ thống đăng nhập và kết nối couple đã được cải tiến với các tính năng mới:
- Login sơ bộ với Google OAuth
- Bổ sung thông tin profile (name, dob)
- Tự động tính cung hoàng đạo (zodiac)
- Kết nối couple bằng couple code
- Đồng bộ thông tin partner

---

## 🚀 Flow Đăng Nhập Mới

### 1. **Login với Google OAuth**

**Endpoint:** `POST /auth/google`

**Request Body:**
```json
{
  "provider": "google",
  "accessToken": "google_oauth_token_from_client"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "needProfile": true,  // true nếu chưa có name hoặc dob
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": null,  // chưa có nếu lần đầu login
    "avatar": "google_avatar_url",
    "dob": null,
    "zodiac": null,
    "mode": "solo",
    "coupleCode": null,
    "partnerId": null,
    "coupleRoomId": null,
    "coins": 0
  }
}
```

**Logic:**
1. Verify Google OAuth token với Google API
2. Lấy thông tin: `id`, `email`, `avatar` từ Google
3. Tìm user theo `provider` + `providerId`
4. Nếu chưa tồn tại → tạo user sơ bộ với email, avatar
5. Kiểm tra `needProfile = !name || !dob`
6. Generate JWT token
7. Trả về response với `needProfile` flag

---

### 2. **Complete Profile (nếu needProfile = true)**

**Endpoint:** `POST /auth/update-profile`

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "dob": "2000-05-15"  // ISO date format YYYY-MM-DD
}
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "avatar": "avatar_url",
  "dob": "2000-05-15T00:00:00.000Z",
  "zodiac": "Taurus",  // Tự động tính từ dob
  "mode": "solo",
  "coupleCode": null,
  "partnerId": null,
  "coupleRoomId": null,
  "coins": 0
}
```

**Logic:**
1. Nhận name và dob từ request
2. Tính zodiac tự động từ dob
3. Update user với name, dob, zodiac
4. Trả về full user profile

---

## 💑 Flow Kết Nối Couple

### 3. **Generate Couple Code**

**Endpoint:** `POST /couple/generate-code`

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "coupleCode": "ABC123",
  "message": "Couple code generated successfully. Share this with your partner!"
}
```

**Logic:**
1. Kiểm tra user chưa có coupleCode
2. Kiểm tra user chưa ở mode couple
3. Generate unique 6-character code (A-Z, 0-9)
4. Lưu coupleCode vào user
5. User chia sẻ code này cho partner

---

### 4. **Join Couple bằng Code**

**Endpoint:** `POST /couple/join-by-code`

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Request Body:**
```json
{
  "coupleCode": "ABC123"
}
```

**Response:**
```json
{
  "message": "Successfully connected as couple!",
  "coupleRoomId": "couple_room_id",
  "partnerId": "partner_user_id",
  "partnerName": "Partner Name",
  "partnerAvatar": "partner_avatar_url"
}
```

**Logic:**
1. Tìm user có coupleCode này
2. Validate:
   - Không dùng code của chính mình
   - Partner chưa kết nối với ai
   - Current user chưa kết nối với ai
3. Tạo CoupleRoom mới với 2 members
4. Update cả 2 users:
   - `mode` = "couple"
   - `partnerId` = partner's ID
   - `coupleRoomId` = room ID
   - Clear `coupleCode` của partner
5. Trả về thông tin kết nối

---

## 🗄️ Database Schema Changes

### **User Schema** (Updated)

```typescript
{
  provider: string,           // 'google' | 'facebook'
  providerId: string,         // OAuth provider ID
  email: string,              // ✨ NEW - Email from OAuth
  name?: string,              // ✨ Optional now - Filled later
  avatar?: string,
  dob?: Date,                 // ✨ NEW - Date of birth
  zodiac?: string,            // ✨ NEW - Auto-calculated
  mode: string,               // 'solo' | 'couple'
  coupleCode?: string,        // ✨ NEW - For partner matching
  partnerId?: string,         // ✨ NEW - Partner's user ID
  coupleRoomId?: string,
  coins: number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🌟 Zodiac Calculation

Tự động tính cung hoàng đạo từ ngày sinh:

| Cung | Tiếng Anh | Ngày |
|------|-----------|------|
| Bạch Dương | Aries | 21/3 - 19/4 |
| Kim Ngưu | Taurus | 20/4 - 20/5 |
| Song Tử | Gemini | 21/5 - 20/6 |
| Cự Giải | Cancer | 21/6 - 22/7 |
| Sư Tử | Leo | 23/7 - 22/8 |
| Xử Nữ | Virgo | 23/8 - 22/9 |
| Thiên Bình | Libra | 23/9 - 22/10 |
| Bọ Cạp | Scorpio | 23/10 - 21/11 |
| Nhân Mã | Sagittarius | 22/11 - 21/12 |
| Ma Kết | Capricorn | 22/12 - 19/1 |
| Bảo Bình | Aquarius | 20/1 - 18/2 |
| Song Ngư | Pisces | 19/2 - 20/3 |

---

## 📁 Files Changed/Created

### ✨ New Files:
1. `src/shared/utils/zodiac.util.ts` - Zodiac calculation & couple code generator
2. `src/modules/auth/dto/update-profile.dto.ts` - Update profile DTO
3. `NEW_LOGIN_COUPLE_FLOW.md` - This documentation

### 📝 Updated Files:
1. `src/modules/user/schemas/user.schema.ts` - Added new fields
2. `src/modules/auth/auth.service.ts` - New login logic + updateProfile method
3. `src/modules/auth/auth.controller.ts` - New update-profile endpoint
4. `src/modules/couple/couple.service.ts` - New couple code methods
5. `src/modules/couple/couple.controller.ts` - New couple code endpoints
6. `src/modules/couple/couple.module.ts` - Import User model
7. `src/modules/user/user.service.ts` - Return full user info

---

## 🔄 Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│  1. User clicks "Login with Google" on mobile app           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Google OAuth flow → Get accessToken                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. POST /auth/google with accessToken                      │
│     → Response: { token, needProfile: true, user }          │
└────────────────────────┬────────────────────────────────────┘
                         │
                 ┌───────┴───────┐
                 │               │
          needProfile=true  needProfile=false
                 │               │
                 ▼               ▼
    ┌────────────────────┐  ┌──────────────┐
    │ 4. Show Profile    │  │ 7. Go to     │
    │    Setup Screen    │  │    Home      │
    └────────┬───────────┘  └──────────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │ 5. POST /auth/update-profile           │
    │    { name, dob }                       │
    │    → Zodiac auto-calculated            │
    └────────┬───────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │ 6. Profile complete → Go to Home       │
    └────────┬───────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────────────┐
    │ 7. User in "solo" mode                 │
    └────────┬───────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    Want to        Partner has
    create code    a code
    │                 │
    ▼                 ▼
┌──────────────┐  ┌────────────────────────┐
│ 8. POST      │  │ 9. POST                │
│ /couple/     │  │ /couple/join-by-code   │
│ generate-    │  │ { coupleCode }         │
│ code         │  │                        │
│ → ABC123     │  │ → Connected!           │
└──────┬───────┘  └────────┬───────────────┘
       │                   │
       │  Share code       │
       │  via chat         │
       └──────────┬────────┘
                  │
                  ▼
       ┌──────────────────────────┐
       │ 10. Both users now:      │
       │     - mode = "couple"    │
       │     - have partnerId     │
       │     - share coupleRoomId │
       │     - can use app        │
       │       together           │
       └──────────────────────────┘
```

---

## 🔧 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/google` | ❌ | Login với Google OAuth |
| POST | `/auth/facebook` | ❌ | Login với Facebook OAuth |
| POST | `/auth/update-profile` | ✅ | Bổ sung name & dob |
| POST | `/couple/generate-code` | ✅ | Tạo couple code |
| POST | `/couple/join-by-code` | ✅ | Join couple bằng code |
| POST | `/couple/create` | ✅ | (Existing) Create couple room |
| POST | `/couple/join` | ✅ | (Existing) Join couple room |
| GET | `/couple/info` | ✅ | (Existing) Get couple room info |

---

## 🎯 Testing Flow

### Test Case 1: First Time Login
```bash
# 1. Login
POST /auth/google
{
  "provider": "google",
  "accessToken": "..."
}

# Expected: needProfile = true, name = null, dob = null

# 2. Complete Profile
POST /auth/update-profile
Authorization: Bearer {token}
{
  "name": "Test User",
  "dob": "2000-05-15"
}

# Expected: zodiac = "Taurus", profile completed
```

### Test Case 2: Couple Connection
```bash
# User A generates code
POST /couple/generate-code
Authorization: Bearer {token_A}

# Response: { coupleCode: "ABC123" }

# User B joins with code
POST /couple/join-by-code
Authorization: Bearer {token_B}
{
  "coupleCode": "ABC123"
}

# Expected: Both users connected, coupleRoomId created
```

---

## 🚨 Validation Rules

1. **Email**: Required, từ OAuth provider
2. **Name**: Required for profile completion, min 1 character
3. **DOB**: Required, must be valid date in ISO format
4. **Couple Code**: 6 characters, alphanumeric, unique
5. **Mode**: Can only be 'solo' or 'couple'
6. **Partner Connection**: Cannot connect if already in couple mode

---

## 📱 Frontend Integration Notes

1. **Sau login**, check `needProfile` flag:
   ```javascript
   if (response.needProfile) {
     navigate('/complete-profile');
   } else {
     navigate('/home');
   }
   ```

2. **Complete Profile Screen**:
   - Input: Name (text)
   - Input: Date of Birth (date picker)
   - Submit → Update profile

3. **Couple Connection**:
   - Option 1: Generate Code → Show code for sharing
   - Option 2: Enter Code → Input partner's code

4. **Store JWT Token** sau khi login thành công
5. **Include token** trong tất cả authenticated requests

---

## 🔐 Security Notes

- JWT token expires theo config (default: 7d hoặc 30d)
- OAuth tokens được verify với Google/Facebook API
- Couple codes are unique và được check kỹ trước khi connect
- Không thể self-connect hoặc connect khi đã có partner

---

## 📞 Support & Questions

Nếu có vấn đề hoặc câu hỏi:
1. Check API response messages
2. Verify JWT token chưa expire
3. Ensure proper request body format
4. Check user's current mode & partner status

---

**🎉 Implementation Complete!**

Tất cả logic đã được triển khai và sẵn sàng cho testing & deployment.

