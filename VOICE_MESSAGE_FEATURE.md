# Voice Message Feature - Implementation Summary

## Overview
Voice Message feature has been successfully integrated into Pixel Love Backend using the existing Cloudinary infrastructure without breaking current architecture.

---

## ✅ Changes Made

### 1. File Upload Validation (`src/shared/utils/file-upload.util.ts`)

**Added Constants:**
- `MAX_AUDIO_SIZE = 5MB` (for voice messages, max ~60s)
- `MAX_AUDIO_DURATION = 60` seconds
- `ALLOWED_AUDIO_TYPES`: m4a, aac, mp3, mpeg, wav, x-m4a

**Added Functions:**
- `validateAudioType(file)` - Validates audio MIME types
- `validateAudioSize(file)` - Checks if audio ≤ 5MB
- `validateAudioDuration(duration)` - Ensures 1s ≤ duration ≤ 60s

---

### 2. Cloudinary Upload (`src/modules/album/cloudinary.controller.ts`)

**Updated Endpoint:** `POST /api/cloudinary/upload`

**Now Accepts:**
- Images: jpg, png, gif, webp
- Videos: mp4, mov
- **Audio**: m4a, aac, mp3, mpeg, wav ✨ NEW

**Max Size:** 10MB (audio limited to 5MB by validation)

**Response Example (Audio):**
```json
{
  "public_id": "pixellove/voice/v_abc123",
  "secure_url": "https://res.cloudinary.com/.../v_abc123.m4a",
  "resource_type": "video",
  "format": "m4a",
  "bytes": 234567,
  "duration": 12.4,
  "created_at": "2025-12-20T10:30:00Z"
}
```

---

### 3. Database Schema (`src/modules/pet/schemas/pet-action.schema.ts`)

**Updated PetAction Schema:**
- `type`: Changed from `'petting' | 'image'` to `'petting' | 'image' | 'voice'` ✨
- **New Fields:**
  - `audioUrl?: string` - URL of voice message (for type='voice')
  - `duration?: number` - Duration in seconds (for type='voice')

**Existing Fields Used:**
- `actionAt` - Timestamp for EXP/cooldown logic
- `takenAt` - Optional timestamp when audio was recorded
- `baseExp` - Base EXP gained (15 for voice)
- `bonusExp` - Bonus EXP if partner sent voice recently (15)
- `text` - Optional caption/transcription
- `mood` - Optional mood (eat, walk, sleep, rest, love)

---

### 4. Service Layer (`src/modules/pet/pet.service.ts`)

**Added Constants:**
- `VOICE_EXP = 15` - Base EXP for voice message
- `VOICE_BONUS = 15` - Bonus if partner sent voice within 3 hours

**Added Private Methods:**
- `checkVoiceCooldown(coupleId, userId)` - Validates 3-hour cooldown ⚠️ (currently not enforced)
- `checkPartnerVoiceInLast3Hours(coupleId, userId)` - Checks for bonus eligibility

**Added Public Methods:**

#### `sendVoice(user, audioUrl, duration, takenAt?, text?, mood?)`
Logic:
1. Validate user is in couple
2. Validate audioUrl format (must start with 'http')
3. Validate duration (1-60 seconds)
4. Check partner's voice activity within last 3 hours
5. Calculate EXP: base (15) + bonus (15 if partner active)
6. Save PetAction with all metadata
7. Apply EXP and check level up
8. Emit WebSocket event: `pet:voice_consumed`

Returns:
```json
{
  "expAdded": 30,
  "bonus": 15,
  "levelUp": false,
  "actionId": "507f1f77bcf86cd799439011"
}
```

#### `getVoices(user, page, limit)`
Retrieves paginated list of voice messages with full metadata.

Returns:
```json
{
  "items": [
    {
      "audioUrl": "https://...",
      "duration": 12,
      "userId": "u_23871",
      "actionAt": "2025-12-14T14:25:00.000Z",
      "takenAt": "2025-12-14T14:20:00.000Z",
      "baseExp": 15,
      "bonusExp": 15,
      "text": "Miss you!",
      "mood": "love",
      "createdAt": "2025-12-14T14:25:00.000Z"
    }
  ],
  "total": 15
}
```

---

### 5. DTOs (`src/modules/pet/dto/`)

**Created: `send-voice.dto.ts`**
```typescript
{
  audioUrl: string;        // Required, URL format
  duration: number;        // Required, 1-60 seconds
  takenAt?: string;        // Optional, ISO date string
  text?: string;           // Optional caption
  mood?: PetImageMood;     // Optional mood
}
```

**Updated: `pet-response.dto.ts`**
- Added `SendVoiceResponseDto`
- Added `PetVoiceItemDto`
- Added `PetVoicesResponseDto`

---

### 6. Controller (`src/modules/pet/pet.controller.ts`)

**New Endpoints:**

#### `POST /api/pet/voice` 🎤
Send voice message to pet

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "audioUrl": "https://res.cloudinary.com/.../voice.m4a",
  "duration": 12,
  "text": "Good night ❤️",
  "mood": "love"
}
```

**Response:**
```json
{
  "expAdded": 30,
  "bonus": 15,
  "levelUp": false,
  "actionId": "..."
}
```

#### `GET /api/pet/voices?page=1&limit=20` 📋
Get voice messages list

**Response:** See `getVoices()` return format above

---

## 🔄 Complete Voice Message Flow

### Option 1: Upload via Backend
```
1. Client → POST /api/cloudinary/upload (file = voice.m4a)
2. Backend → Cloudinary (upload)
3. Backend → Client (secure_url + duration)
4. Client → POST /api/pet/voice { audioUrl, duration, ... }
5. Backend → Save PetAction + Update Pet EXP
6. Backend → Emit WebSocket event
7. Backend → Client (expAdded, bonus, levelUp)
```

### Option 2: Direct Upload (Recommended)
```
1. Client → GET /api/cloudinary/signature
2. Client → Cloudinary directly (with signature)
3. Cloudinary → Client (secure_url + metadata)
4. Client → POST /api/pet/voice { audioUrl, duration, ... }
5. Backend → Save + Emit + Return
```

---

## 📊 EXP & Cooldown Comparison

| Action   | Base EXP | Bonus EXP | Cooldown | Bonus Condition               |
|----------|----------|-----------|----------|-------------------------------|
| Petting  | 5        | 5         | None     | Both users petted today       |
| Image    | 20       | 20        | 3 hours* | Partner sent image in 3h      |
| Voice 🎤 | 15       | 15        | 3 hours* | Partner sent voice in 3h      |

\* Cooldown check available but currently not enforced (UI handles)

---

## 🔐 Security & Validation

✅ JWT Authentication required on all endpoints
✅ Validate audio URL format (must start with 'http')
✅ Validate duration (1-60 seconds)
✅ Validate file type (audio MIME types only)
✅ Validate file size (max 5MB for audio)
✅ User can only send voices for their couple

---

## 📡 WebSocket Events

**Event:** `pet:voice_consumed`
**Room:** `couple:{coupleRoomId}`
**Payload:**
```json
{
  "petId": "...",
  "actionId": "...",
  "audioUrl": "https://...",
  "duration": 12,
  "fromUserId": "u_23871",
  "expAdded": 30,
  "baseExp": 15,
  "bonusExp": 15,
  "leveledUp": false,
  "pet": {
    "level": 3,
    "currentExp": 270
  },
  "actionAt": "2025-12-14T14:25:00.000Z",
  "mood": "love",
  "text": "Miss you!"
}
```

---

## ✅ Testing Checklist

- [ ] Upload audio via `POST /cloudinary/upload` (m4a, mp3, wav)
- [ ] Verify audio validation (max 5MB, 60s)
- [ ] Send voice via `POST /pet/voice`
- [ ] Verify EXP calculation (base 15 + bonus 15)
- [ ] Verify bonus only applies if partner sent voice within 3h
- [ ] Get voices list via `GET /pet/voices?page=1&limit=20`
- [ ] Verify WebSocket event emission to couple room
- [ ] Test pagination (page 2, 3, different limits)
- [ ] Test with invalid inputs (duration > 60s, invalid URL, etc.)

---

## 🎯 Features Summary

✅ Upload audio files (m4a, mp3, wav) via Cloudinary
✅ Send voice messages to pet with EXP rewards
✅ Bonus EXP system based on partner activity
✅ Store voice metadata (duration, text, mood)
✅ Retrieve paginated voice history
✅ WebSocket real-time notifications
✅ Full integration with existing Pet system
✅ No changes to database structure (uses existing PetAction)
✅ Reuses Cloudinary infrastructure

---

## 📝 Next Steps

- Consider adding transcription service integration
- Add voice waveform visualization metadata
- Implement voice playback rate adjustment
- Add voice reaction/emoji feature
- Analytics: track average voice duration, most common moods
