# 🧪 API Testing Examples - New Login & Couple Flow

## 🎯 Quick Test Scenarios

### Scenario 1: Complete User Journey (First Time User)

#### Step 1: Login with Google (First Time)
```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "accessToken": "ya29.a0AfH6SMBx..."
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "needProfile": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@gmail.com",
    "name": null,
    "avatar": "https://lh3.googleusercontent.com/...",
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

#### Step 2: Complete Profile
```bash
curl -X POST http://localhost:3000/auth/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Nguyễn Văn A",
    "dob": "2000-05-15"
  }'
```

**Expected Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@gmail.com",
  "name": "Nguyễn Văn A",
  "avatar": "https://lh3.googleusercontent.com/...",
  "dob": "2000-05-15T00:00:00.000Z",
  "zodiac": "Taurus",
  "mode": "solo",
  "coupleCode": null,
  "partnerId": null,
  "coupleRoomId": null,
  "coins": 0
}
```

---

### Scenario 2: Returning User Login

```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "accessToken": "ya29.a0AfH6SMBx..."
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "needProfile": false,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@gmail.com",
    "name": "Nguyễn Văn A",
    "avatar": "https://lh3.googleusercontent.com/...",
    "dob": "2000-05-15T00:00:00.000Z",
    "zodiac": "Taurus",
    "mode": "solo",
    "coupleCode": null,
    "partnerId": null,
    "coupleRoomId": null,
    "coins": 0
  }
}
```

---

### Scenario 3: Couple Connection Flow

#### User A: Generate Couple Code
```bash
curl -X POST http://localhost:3000/couple/generate-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_A_TOKEN}"
```

**Expected Response:**
```json
{
  "coupleCode": "ABC123",
  "message": "Couple code generated successfully. Share this with your partner!"
}
```

#### User A: Try Generate Again (Should Return Existing)
```bash
curl -X POST http://localhost:3000/couple/generate-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_A_TOKEN}"
```

**Expected Response:**
```json
{
  "coupleCode": "ABC123",
  "message": "You already have a couple code"
}
```

#### User B: Join with User A's Code
```bash
curl -X POST http://localhost:3000/couple/join-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_B_TOKEN}" \
  -d '{
    "coupleCode": "ABC123"
  }'
```

**Expected Response:**
```json
{
  "message": "Successfully connected as couple!",
  "coupleRoomId": "507f1f77bcf86cd799439012",
  "partnerId": "507f1f77bcf86cd799439011",
  "partnerName": "Nguyễn Văn A",
  "partnerAvatar": "https://lh3.googleusercontent.com/..."
}
```

#### Verify User A & B are Connected
```bash
# User A check profile
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer {USER_A_TOKEN}"

# User B check profile
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer {USER_B_TOKEN}"
```

**Expected Response (Both should have):**
```json
{
  "mode": "couple",
  "partnerId": "{partner_user_id}",
  "coupleRoomId": "507f1f77bcf86cd799439012",
  ...
}
```

---

## 🚨 Error Cases Testing

### 1. Invalid Couple Code
```bash
curl -X POST http://localhost:3000/couple/join-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "coupleCode": "WRONG1"
  }'
```

**Expected Error:**
```json
{
  "statusCode": 404,
  "message": "Invalid couple code"
}
```

### 2. Using Own Couple Code
```bash
curl -X POST http://localhost:3000/couple/join-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_A_TOKEN}" \
  -d '{
    "coupleCode": "ABC123"
  }'
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "You cannot use your own couple code"
}
```

### 3. Already Connected User
```bash
# User A (already connected) tries to generate new code
curl -X POST http://localhost:3000/couple/generate-code \
  -H "Authorization: Bearer {USER_A_TOKEN}"
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "You are already connected with a partner"
}
```

### 4. Partner Already Connected
```bash
# User C tries to join with User A's old code (but A is connected)
curl -X POST http://localhost:3000/couple/join-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_C_TOKEN}" \
  -d '{
    "coupleCode": "ABC123"
  }'
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": "This user is already connected with someone"
}
```

### 5. Invalid Date Format
```bash
curl -X POST http://localhost:3000/auth/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "name": "Test User",
    "dob": "15-05-2000"
  }'
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": ["dob must be a valid ISO 8601 date string"]
}
```

### 6. Missing Required Fields
```bash
curl -X POST http://localhost:3000/auth/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "name": "Test User"
  }'
```

**Expected Error:**
```json
{
  "statusCode": 400,
  "message": ["dob should not be empty"]
}
```

---

## 📋 Postman Collection Variables

Setup these variables in Postman:

```javascript
// Environment Variables
{
  "baseUrl": "http://localhost:3000",
  "userA_token": "",  // Set after User A login
  "userB_token": "",  // Set after User B login
  "userA_id": "",
  "userB_id": "",
  "coupleCode": "",   // Set after generate-code
  "coupleRoomId": ""  // Set after successful join
}
```

**Auto-save token script** (add to login requests):
```javascript
// In Postman Tests tab
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("userA_token", response.token);
    pm.environment.set("userA_id", response.user.id);
}
```

---

## 🧪 Test Data Examples

### Valid DOBs with Expected Zodiacs
```json
[
  { "dob": "2000-01-15", "zodiac": "Capricorn" },
  { "dob": "2000-02-14", "zodiac": "Aquarius" },
  { "dob": "2000-03-21", "zodiac": "Aries" },
  { "dob": "2000-05-15", "zodiac": "Taurus" },
  { "dob": "2000-06-15", "zodiac": "Gemini" },
  { "dob": "2000-07-15", "zodiac": "Cancer" },
  { "dob": "2000-08-15", "zodiac": "Leo" },
  { "dob": "2000-09-15", "zodiac": "Virgo" },
  { "dob": "2000-10-15", "zodiac": "Libra" },
  { "dob": "2000-11-15", "zodiac": "Scorpio" },
  { "dob": "2000-12-15", "zodiac": "Sagittarius" },
  { "dob": "2001-02-25", "zodiac": "Pisces" }
]
```

### Test Names (UTF-8 Support)
```json
[
  "Nguyễn Văn A",
  "Trần Thị B",
  "John Doe",
  "Marie-Claire",
  "李明",
  "佐藤太郎",
  "محمد",
  "Müller"
]
```

---

## 🔄 Complete Integration Test Script

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "=== Test 1: User A Login ==="
USER_A_RESPONSE=$(curl -s -X POST $BASE_URL/auth/google \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "accessToken": "test_token_a"}')
echo $USER_A_RESPONSE

USER_A_TOKEN=$(echo $USER_A_RESPONSE | jq -r '.token')
echo "User A Token: $USER_A_TOKEN"

echo -e "\n=== Test 2: User A Complete Profile ==="
curl -s -X POST $BASE_URL/auth/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_A_TOKEN" \
  -d '{"name": "User A", "dob": "2000-05-15"}' | jq

echo -e "\n=== Test 3: User A Generate Couple Code ==="
COUPLE_CODE_RESPONSE=$(curl -s -X POST $BASE_URL/couple/generate-code \
  -H "Authorization: Bearer $USER_A_TOKEN")
echo $COUPLE_CODE_RESPONSE | jq

COUPLE_CODE=$(echo $COUPLE_CODE_RESPONSE | jq -r '.coupleCode')
echo "Couple Code: $COUPLE_CODE"

echo -e "\n=== Test 4: User B Login ==="
USER_B_RESPONSE=$(curl -s -X POST $BASE_URL/auth/google \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "accessToken": "test_token_b"}')
echo $USER_B_RESPONSE | jq

USER_B_TOKEN=$(echo $USER_B_RESPONSE | jq -r '.token')

echo -e "\n=== Test 5: User B Complete Profile ==="
curl -s -X POST $BASE_URL/auth/update-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -d '{"name": "User B", "dob": "2001-08-20"}' | jq

echo -e "\n=== Test 6: User B Join with Code ==="
curl -s -X POST $BASE_URL/couple/join-by-code \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  -d "{\"coupleCode\": \"$COUPLE_CODE\"}" | jq

echo -e "\n=== Test 7: Verify User A Profile ==="
curl -s -X GET $BASE_URL/user/profile \
  -H "Authorization: Bearer $USER_A_TOKEN" | jq

echo -e "\n=== Test 8: Verify User B Profile ==="
curl -s -X GET $BASE_URL/user/profile \
  -H "Authorization: Bearer $USER_B_TOKEN" | jq

echo -e "\n=== All Tests Complete ==="
```

---

## 📊 Expected Database State After Tests

### Users Collection
```javascript
// User A
{
  _id: ObjectId("..."),
  provider: "google",
  providerId: "google_user_a_id",
  email: "usera@gmail.com",
  name: "User A",
  dob: ISODate("2000-05-15T00:00:00.000Z"),
  zodiac: "Taurus",
  mode: "couple",
  coupleCode: null,  // Cleared after successful connection
  partnerId: ObjectId("user_b_id"),
  coupleRoomId: ObjectId("couple_room_id"),
  coins: 0,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}

// User B
{
  _id: ObjectId("..."),
  provider: "google",
  providerId: "google_user_b_id",
  email: "userb@gmail.com",
  name: "User B",
  dob: ISODate("2001-08-20T00:00:00.000Z"),
  zodiac: "Leo",
  mode: "couple",
  coupleCode: null,
  partnerId: ObjectId("user_a_id"),
  coupleRoomId: ObjectId("couple_room_id"),
  coins: 0,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### CoupleRooms Collection
```javascript
{
  _id: ObjectId("couple_room_id"),
  code: "RANDOM6",
  members: [
    ObjectId("user_a_id"),
    ObjectId("user_b_id")
  ],
  petLevel: 1,
  exp: 0,
  petType: "cat",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🎯 Performance Testing

### Load Test with Artillery

```yaml
# artillery-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
  processor: "./test-processor.js"

scenarios:
  - name: "Complete User Flow"
    flow:
      - post:
          url: "/auth/google"
          json:
            provider: "google"
            accessToken: "{{ $randomString() }}"
          capture:
            - json: "$.token"
              as: "token"
      - post:
          url: "/auth/update-profile"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            name: "Test User"
            dob: "2000-05-15"
      - post:
          url: "/couple/generate-code"
          headers:
            Authorization: "Bearer {{ token }}"
```

Run with:
```bash
artillery run artillery-test.yml
```

---

## 🔍 Debugging Tips

### 1. Check JWT Token
```bash
# Decode JWT (without verifying signature)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | \
  cut -d. -f2 | base64 -d | jq
```

### 2. MongoDB Queries
```javascript
// Find user by email
db.users.findOne({ email: "user@gmail.com" })

// Find all users in couple mode
db.users.find({ mode: "couple" })

// Find couple room by code
db.couplerooms.findOne({ code: "ABC123" })

// Check users with couple codes
db.users.find({ coupleCode: { $ne: null } })
```

### 3. Check API Health
```bash
curl http://localhost:3000/
# Should return: {"message":"Pixel Love API is running"}
```

---

## ✅ Testing Checklist

- [ ] User can login with Google OAuth
- [ ] needProfile flag works correctly
- [ ] User can complete profile with name & dob
- [ ] Zodiac is calculated correctly
- [ ] User can generate couple code
- [ ] Couple code is unique
- [ ] Partner can join with code
- [ ] Both users are connected after join
- [ ] Cannot use own code
- [ ] Cannot connect if already connected
- [ ] Cannot join if partner already connected
- [ ] Validation errors are clear
- [ ] JWT authentication works
- [ ] User profile returns all fields

---

**🎉 Happy Testing!**

All endpoints are ready for thorough testing and validation.

