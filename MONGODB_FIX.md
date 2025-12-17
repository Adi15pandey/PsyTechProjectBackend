# MongoDB Connection Fix Guide

## Current Issue

**Error:** `Client network socket disconnected before secure TLS connection was established`

**Cause:** MongoDB Atlas is blocking Render's IP addresses because they are not whitelisted.

---

## Solution: Whitelist IP Addresses

### Quick Fix (2 minutes):

1. **Go to MongoDB Atlas:**
   - URL: https://cloud.mongodb.com
   - Login with your account

2. **Navigate to Network Access:**
   - Click on your project
   - Click **"Network Access"** in the left sidebar
   - (It's under "Security" section)

3. **Add IP Address:**
   - Click the green **"Add IP Address"** button
   - Click **"Allow Access from Anywhere"** button
   - This will automatically fill: `0.0.0.0/0`
   - Add comment: "Render deployment"
   - Click **"Confirm"**

4. **Wait:**
   - Wait 1-2 minutes for changes to apply
   - MongoDB Atlas will show "Status: Active" when ready

5. **Verify:**
   - Check Render logs - should see "MongoDB connected successfully"
   - Test API: `curl https://psytech-backend.onrender.com/health`

---

## Verify Connection

### Check Database Status:

```bash
curl https://psytech-backend.onrender.com/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```

---

## Your MongoDB Connection String

```
mongodb+srv://aditya15152424_db_user:pdgfJgGnSxLPRQua@psytechproject.kxkcjvh.mongodb.net/psytech_db?retryWrites=true&w=majority
```

**This is correct!** The issue is only the IP whitelist.

---

## After Whitelisting

1. Render will automatically retry connection
2. You'll see in logs: `✅ MongoDB connected successfully`
3. All API endpoints will work
4. Users will be saved to MongoDB
5. OTPs will be stored and verified properly

---

## Security Note

- `0.0.0.0/0` allows access from any IP
- For production, you can restrict to specific IPs later
- For now, this is the easiest solution

---

## Still Not Working?

1. **Check MongoDB Atlas Dashboard:**
   - Go to Network Access
   - Verify `0.0.0.0/0` is listed and status is "Active"

2. **Check Connection String:**
   - Verify MONGODB_URI in Render environment variables
   - Should match: `mongodb+srv://aditya15152424_db_user:pdgfJgGnSxLPRQua@psytechproject.kxkcjvh.mongodb.net/psytech_db?retryWrites=true&w=majority`

3. **Check Render Logs:**
   - Look for connection attempts
   - Should see retry messages if IP is whitelisted

4. **Wait Longer:**
   - Sometimes takes 2-5 minutes for changes to propagate

---

## Test After Fix

```bash
# Should show database connected
curl https://psytech-backend.onrender.com/health

# Should work without timeout
curl -X POST https://psytech-backend.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

