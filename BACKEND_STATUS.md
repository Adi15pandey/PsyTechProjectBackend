# Backend Status Check

## Current Status

### ✅ Server Status: RUNNING
- **URL:** `https://psytech-backend.onrender.com`
- **Health Check:** Working
- **API Endpoints:** All accessible

### ⚠️ Database Status: NOT CONNECTED
- **Issue:** MongoDB Atlas IP whitelist not configured
- **Impact:** Database operations timeout
- **Workaround:** API works for basic OTP (hardcoded 123456) without DB

---

## How to Fix Database Connection

### Step 1: Whitelist IP in MongoDB Atlas

1. Go to: https://cloud.mongodb.com
2. Select your cluster: `psytechproject`
3. Click **Network Access** (left sidebar)
4. Click **Add IP Address**
5. Click **Allow Access from Anywhere**
6. Enter: `0.0.0.0/0`
7. Click **Confirm**
8. Wait 1-2 minutes

### Step 2: Verify Connection

After whitelisting, check Render logs. You should see:
```
MongoDB connected successfully
Mongoose connected to MongoDB
```

---

## Current API Behavior

### Without Database Connection:
- ✅ Server runs
- ✅ Health check works
- ✅ Send OTP works (hardcoded 123456)
- ⚠️ Verify OTP works (hardcoded 123456) but can't create users
- ❌ User registration/profile requires database

### With Database Connection:
- ✅ All features work
- ✅ Users stored in MongoDB
- ✅ OTPs stored and verified
- ✅ Refresh tokens stored
- ✅ Full functionality

---

## Test Commands

```bash
# Health check
curl https://psytech-backend.onrender.com/health

# Send OTP (works without DB)
curl -X POST https://psytech-backend.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'

# Verify OTP (works with hardcoded 123456, but user creation needs DB)
curl -X POST https://psytech-backend.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

---

## Next Steps

1. **Whitelist MongoDB Atlas IPs** (required for full functionality)
2. Wait for connection to establish
3. Test all endpoints
4. Backend will be fully operational

---

## Error Messages

**If you see:**
- `buffering timed out` = Database not connected
- `ECONNRESET` = IP not whitelisted
- `TLS connection` = IP not whitelisted

**Solution:** Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access

