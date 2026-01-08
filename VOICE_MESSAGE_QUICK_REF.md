# 🎤 Voice Message - Quick Reference

## API Endpoints

### 1. Upload Audio
**POST** `/api/cloudinary/upload`
```bash
curl -X POST https://api.pixellove.com/cloudinary/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@voice.m4a"
```

### 2. Send Voice to Pet
**POST** `/api/pet/voice`
```json
{
  "audioUrl": "https://res.cloudinary.com/.../voice.m4a",
  "duration": 12,
  "text": "Good night ❤️",
  "mood": "love"
}
```

### 3. Get Voice History
**GET** `/api/pet/voices?page=1&limit=20`

---

## Audio Specifications

**Supported Formats:**
- m4a, aac, mp3, mpeg, wav

**Limits:**
- Max file size: 5MB
- Max duration: 60 seconds
- Min duration: 1 second

---

## EXP Rewards

**Base:** 15 EXP per voice
**Bonus:** +15 EXP if partner sent voice in last 3 hours
**Total:** Up to 30 EXP

---

## Validation Rules

✅ audioUrl must start with "http"
✅ duration: 1 ≤ d ≤ 60
✅ User must be in couple
✅ File size ≤ 5MB
✅ Valid audio MIME type

---

## Response Example

```json
{
  "expAdded": 30,
  "bonus": 15,
  "levelUp": false,
  "actionId": "507f1f77bcf86cd799439011"
}
```

---

## WebSocket Event

**Event:** `pet:voice_consumed`
**Emitted to:** Both users in couple
**Use case:** Real-time notification when partner sends voice

---

## Testing

```bash
# 1. Upload
curl -X POST /api/cloudinary/upload -F "file=@test.m4a"

# 2. Send voice
curl -X POST /api/pet/voice \
  -H "Content-Type: application/json" \
  -d '{"audioUrl":"https://...","duration":12}'

# 3. Get list
curl -X GET /api/pet/voices?page=1&limit=10
```
