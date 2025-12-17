# Complete API Documentation

**Base URL:** `https://psytech-backend.onrender.com`

---

## Authentication Flow

```
1. User enters phone number
   ↓
2. POST /api/auth/send-otp
   ↓
3. User receives OTP (123456 in dev mode)
   ↓
4. POST /api/auth/verify-otp
   ↓
5. Receive accessToken + refreshToken
   ↓
6. Use accessToken for API calls
   ↓
7. When accessToken expires, use refreshToken to get new tokens
```

---

## API Endpoints

### 1. Send OTP

**POST** `/api/auth/send-otp`

Send OTP to phone number.

**Request:**
```json
{
  "phoneNumber": "+919876543210"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Responses:**
- `400` - Invalid phone number format
- `429` - Rate limit exceeded (max 3 per hour)
- `500` - Server error

---

### 2. Verify OTP

**POST** `/api/auth/verify-otp`

Verify OTP and get access + refresh tokens.

**Request:**
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "user123",
    "phoneNumber": "+919876543210",
    "name": null,
    "businessName": null,
    "purpose": "personal",
    "showDate": true,
    "language": "english",
    "profileImagePath": null,
    "logoPath": null,
    "isPremium": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "isNewUser": true
}
```

**Important:**
- Save both `accessToken` and `refreshToken`
- `accessToken` expires in 15 minutes (900 seconds)
- `refreshToken` expires in 30 days
- Use `accessToken` in Authorization header for API calls

**Error Responses:**
- `400` - Invalid or expired OTP
- `500` - Server error

---

### 3. Refresh Access Token

**POST** `/api/auth/refresh-token`

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
- `400` - Refresh token is required
- `401` - Invalid or expired refresh token
- `500` - Server error

---

### 4. Logout

**POST** `/api/auth/logout`

Revoke refresh token and logout user.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Register User Profile

**POST** `/api/user/register`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```
phoneNumber: "+919876543210"
name: "John Doe" (optional)
businessName: "My Business" (optional, for business)
purpose: "personal" or "business" (required)
showDate: "true" or "false" (required)
language: "english" or "hindi" (optional, default: "english")
profileImage: <file> (optional, for personal)
logo: <file> (optional, for business)
```

**Response (200):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "user123",
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    "purpose": "personal",
    "showDate": true,
    "language": "english",
    "profileImagePath": "https://psytech-backend.onrender.com/uploads/profile_123.jpg",
    ...
  }
}
```

**Error Responses:**
- `400` - Invalid data
- `401` - Unauthorized (invalid/missing token)
- `500` - Server error

---

### 6. Get User Profile

**GET** `/api/user/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "phoneNumber": "+919876543210",
    "name": "John Doe",
    ...
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found

---

### 7. Update User Profile

**PUT** `/api/user/me`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request Body (FormData - all fields optional):**
```
name: "Updated Name"
businessName: "Updated Business"
showDate: "true" or "false"
language: "english" or "hindi"
profileImage: <file>
logo: <file>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

## Token Management

### Access Token
- **Expiry:** 15 minutes
- **Usage:** Include in `Authorization: Bearer <accessToken>` header
- **Refresh:** Use refresh token when expired

### Refresh Token
- **Expiry:** 30 days
- **Usage:** Store securely, use to get new access tokens
- **Storage:** Saved in MongoDB, automatically deleted when expired

### Token Refresh Flow

```javascript
// 1. Access token expired
// 2. Call refresh-token endpoint
// 3. Get new accessToken + refreshToken
// 4. Update stored tokens
// 5. Retry original request with new accessToken
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid input data
- `INVALID_OTP` - Wrong or expired OTP
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Invalid or missing token
- `INVALID_REFRESH_TOKEN` - Invalid or expired refresh token
- `USER_NOT_FOUND` - User doesn't exist
- `SERVER_ERROR` - Internal server error

---

## Phone Number Format

**Required:** Must include country code with `+` prefix

✅ Valid: `+919876543210`, `+1234567890`
❌ Invalid: `9876543210`, `919876543210`

---

## File Upload

- **Max file size:** 5MB
- **Allowed types:** jpeg, jpg, png, gif, webp
- **Use FormData** for file uploads
- **Fields:** `profileImage` (personal) or `logo` (business)

---

## Rate Limiting

- **OTP requests:** Max 3 per phone number per hour
- **OTP expiry:** 5 minutes
- **Access token expiry:** 15 minutes
- **Refresh token expiry:** 30 days

---

## Development Mode

**Hardcoded OTP:** `123456`

Works automatically in development mode or set:
```
USE_DEV_OTP=true
DEV_OTP=123456
```

---

## MongoDB Collections

### users
- User profile information
- Indexed on `phoneNumber`

### otp_codes
- Temporary OTP storage
- Auto-deleted after expiry (TTL index)

### refreshtokens
- Refresh token storage
- Indexed on `userId`, `token`
- Auto-deleted after expiry (TTL index)

---

## Testing

```bash
# Health check
curl https://psytech-backend.onrender.com/health

# Send OTP
curl -X POST https://psytech-backend.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# Verify OTP
curl -X POST https://psytech-backend.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'

# Refresh Token
curl -X POST https://psytech-backend.onrender.com/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'

# Get User Profile
curl https://psytech-backend.onrender.com/api/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

