# Pixel Love API Documentation

## Base URL
```
http://localhost:3000/api
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

Error responses:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```

---

## Authentication

### Login with Google
**POST** `/auth/google`

Request body:
```json
{
  "provider": "google",
  "accessToken": "google-oauth-access-token"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "avatar": "https://...",
      "mode": "solo",
      "coupleRoomId": null,
      "coins": 0
    }
  }
}
```

### Login with Facebook
**POST** `/auth/facebook`

Request body:
```json
{
  "provider": "facebook",
  "accessToken": "facebook-oauth-access-token"
}
```

Response: Same as Google login

---

## User Management

### Get Current User Profile
**GET** `/user/me`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "John Doe",
    "avatar": "https://...",
    "mode": "solo",
    "coupleRoomId": null,
    "coins": 100,
    "provider": "google"
  }
}
```

### Update User Profile
**PUT** `/user/update`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request body:
```json
{
  "name": "New Name",
  "avatar": "https://new-avatar.com/image.jpg",
  "mode": "couple"
}
```

Response: Updated user object

---

## Couple Room Management

### Create Couple Room
**POST** `/couple/create`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request body:
```json
{
  "petType": "cat"  // optional
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "room-id",
    "code": "ABC123",
    "members": ["user-id"],
    "petLevel": 1,
    "exp": 0,
    "petType": "cat"
  }
}
```

### Join Couple Room
**POST** `/couple/join`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request body:
```json
{
  "code": "ABC123"
}
```

Response: Couple room object with updated members

### Get Couple Room Info
**GET** `/couple/info`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response: Couple room object

---

## Pet Management

### Get Pet Status
**GET** `/pet/status`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "mode": "couple",
    "petLevel": 5,
    "exp": 45,
    "petType": "cat",
    "coupleRoomId": "room-id"
  }
}
```

### Feed Pet
**POST** `/pet/feed`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "data": {
    "mode": "couple",
    "petLevel": 5,
    "exp": 55,
    "leveledUp": false,
    "expGained": 10
  }
}
```

---

## Memory Management

### Upload Memory
**POST** `/memory/upload`

Headers:
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

Form data:
- `file`: Image or video file
- `type`: "image" or "video"
- `note`: Optional note (string)

Response:
```json
{
  "success": true,
  "data": {
    "id": "memory-id",
    "type": "image",
    "url": "https://r2.cloudflare.com/...",
    "note": "Beautiful moment",
    "expGained": 10,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### List Memories
**GET** `/memory/list?limit=50&skip=0`

Headers:
```
Authorization: Bearer <jwt-token>
```

Query parameters:
- `limit`: Number of memories to return (default: 50)
- `skip`: Number of memories to skip (default: 0)

Response:
```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "memory-id",
        "type": "image",
        "url": "https://...",
        "note": "Beautiful moment",
        "expGained": 10,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "skip": 0
  }
}
```

---

## Payment & Coins

### Create Payment
**POST** `/payment/create`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request body:
```json
{
  "coins": 100
}
```

Response:
```json
{
  "success": true,
  "data": {
    "transactionId": "PIXELLOVE_1234567890_abc123",
    "paymentUrl": "https://payos.vn/payment/...",
    "amount": 100000,
    "coins": 100
  }
}
```

### Payment Webhook (PayOS)
**POST** `/payment/webhook`

This endpoint is called by PayOS when payment status changes.

Request body:
```json
{
  "transactionId": "PIXELLOVE_1234567890_abc123",
  "status": "PAID",
  "data": { ... }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Payment successful, coins added",
    "coins": 100
  }
}
```

### Get Payment History
**GET** `/payment/history`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "PIXELLOVE_1234567890_abc123",
      "amount": 100000,
      "coins": 100,
      "status": "success",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding in production.

---

## Testing with Postman/Insomnia

1. **Login**: Call `/auth/google` or `/auth/facebook` with OAuth token
2. **Copy JWT**: Save the returned `token` value
3. **Set Authorization**: Add header `Authorization: Bearer <token>`
4. **Test endpoints**: All protected endpoints now accessible

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- File uploads limited to 10MB (configurable)
- Supported image formats: JPEG, PNG, GIF
- Supported video formats: MP4, QuickTime
- Coin pricing: 1 coin = 1,000 VND
- Pet level up: 100 EXP per level
- Memory upload: +10 EXP per upload

