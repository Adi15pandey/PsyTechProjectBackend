# MongoDB Schema Documentation

MongoDB collections are created automatically when the first document is inserted. The schemas are defined in the Mongoose models.

## Collections

### users
Stores user profile information.

**Schema:**
- `_id` (String): Unique user ID (UUID)
- `phoneNumber` (String): Phone number with country code (unique, indexed)
- `name` (String): User's name (optional)
- `businessName` (String): Business name (optional)
- `purpose` (String): Either "personal" or "business" (required)
- `showDate` (Boolean): Whether to show date (default: true)
- `language` (String): "english" or "hindi" (default: "english")
- `profileImagePath` (String): URL/path to profile image (optional)
- `logoPath` (String): URL/path to business logo (optional)
- `isPremium` (Boolean): Premium user status (default: false)
- `createdAt` (Date): Auto-generated timestamp
- `updatedAt` (Date): Auto-generated timestamp

**Indexes:**
- `phoneNumber` (unique index)

### otp_codes
Stores temporary OTP codes for phone verification.

**Schema:**
- `_id` (ObjectId): MongoDB auto-generated ID
- `phoneNumber` (String): Phone number (indexed)
- `otpCode` (String): 6-digit OTP code
- `expiresAt` (Date): Expiration timestamp (TTL index for auto-deletion)
- `createdAt` (Date): Auto-generated timestamp
- `updatedAt` (Date): Auto-generated timestamp

**Indexes:**
- `phoneNumber` + `otpCode` (compound index)
- `expiresAt` (TTL index - automatically deletes expired documents)

## Notes

- MongoDB automatically creates collections when first document is inserted
- TTL index on `otp_codes.expiresAt` automatically removes expired OTPs
- No manual schema creation needed - Mongoose handles it

