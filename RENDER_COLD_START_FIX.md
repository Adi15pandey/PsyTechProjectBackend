# Render Cold Start Timeout Fix

## Problem
Render free tier services sleep after 15 minutes of inactivity. When a request comes in after sleep, the service takes **30-60 seconds** to wake up (cold start). Flutter apps with default timeouts (10-30 seconds) will timeout before the service responds.

## Solutions

### Solution 1: Keep Service Awake (Recommended)
Use a free service like **UptimeRobot** to ping the keep-alive endpoint every 10-15 minutes:

1. Go to https://uptimerobot.com
2. Create a free account
3. Add a new monitor:
   - **Monitor Type**: HTTP(s)
   - **URL**: `https://psytech-backend.onrender.com/keep-alive`
   - **Interval**: 10 minutes
   - **Alert Contacts**: (optional)

This will keep your service awake and eliminate cold start delays.

### Solution 2: Increase Flutter Timeout
In your Flutter `api_service.dart`, increase the timeout:

```dart
final response = await http.post(
  uri,
  headers: headers,
  body: body,
).timeout(
  Duration(seconds: 60), // Increase from default 10-30s to 60s
);
```

### Solution 3: Add Retry Logic
Add automatic retry for timeout errors:

```dart
Future<Map<String, dynamic>> sendOTP(String phoneNumber) async {
  int retries = 3;
  while (retries > 0) {
    try {
      return await _request('/api/auth/send-otp', method: 'POST', body: {
        'phoneNumber': phoneNumber,
      });
    } catch (e) {
      if (e.toString().contains('timeout') && retries > 1) {
        retries--;
        await Future.delayed(Duration(seconds: 5));
        continue;
      }
      rethrow;
    }
  }
}
```

### Solution 4: Upgrade Render Plan
Upgrade to Render's paid plan ($7/month) to eliminate cold starts entirely.

## Keep-Alive Endpoint
The `/keep-alive` endpoint has been added to prevent sleep. Ping it every 10-15 minutes using UptimeRobot or similar service.

## Current Status
- ✅ Keep-alive endpoint added: `/keep-alive`
- ✅ Server timeout protection: 20s for send-otp, 25s for verify-otp
- ⚠️ Flutter client timeout needs to be increased to 60s
- ⚠️ Set up UptimeRobot to keep service awake

