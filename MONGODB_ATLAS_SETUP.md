# MongoDB Atlas IP Whitelist Setup for Render

## Problem
Your Render deployment is failing because MongoDB Atlas is blocking connections from Render's IP addresses.

## Solution: Whitelist IP Addresses

### Option 1: Allow All IPs (Easiest - for development)

1. Go to MongoDB Atlas Dashboard: https://cloud.mongodb.com
2. Click on your cluster
3. Go to **Network Access** (left sidebar)
4. Click **Add IP Address**
5. Click **Allow Access from Anywhere**
6. Enter: `0.0.0.0/0`
7. Click **Confirm**
8. Wait 1-2 minutes for changes to apply

**Note:** This allows access from any IP. For production, use Option 2.

---

### Option 2: Whitelist Render IPs (More Secure)

Render uses dynamic IPs, so you need to allow a range:

1. Go to MongoDB Atlas → Network Access
2. Click **Add IP Address**
3. Add these IP ranges:
   - `0.0.0.0/0` (allows all - recommended for Render)
   - OR specific Render IPs if you know them

**Render IP Ranges (if available):**
- Check Render documentation for current IP ranges
- Or use `0.0.0.0/0` for simplicity

---

## Verify Connection

After whitelisting:

1. Wait 1-2 minutes for changes to propagate
2. Check Render logs - should see "MongoDB connected successfully"
3. Test API endpoint: `https://psytech-backend.onrender.com/health`

---

## Current Error

```
MongoDB connection error: Could not connect to any servers in your MongoDB Atlas cluster. 
One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

**Fix:** Add `0.0.0.0/0` to MongoDB Atlas Network Access whitelist.

---

## Security Note

- `0.0.0.0/0` allows access from anywhere
- For production, consider:
  - Using MongoDB Atlas VPC peering
  - Restricting to known IP ranges
  - Using MongoDB Atlas Private Endpoints

For now, `0.0.0.0/0` is fine for development/testing.

