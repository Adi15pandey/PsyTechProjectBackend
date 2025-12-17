# Frontend Integration Guide

## Quick Start

**Base URL:** `https://psytech-backend.onrender.com`

**Hardcoded OTP (Development):** `123456`

---

## Complete React/React Native Example

### 1. API Service Class

```javascript
// api.js
const API_BASE_URL = 'https://psytech-backend.onrender.com';

class ApiService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.loadTokens();
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      this.accessToken = AsyncStorage.getItem('accessToken');
      this.refreshToken = AsyncStorage.getItem('refreshToken');
    }
  }

  async saveTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
    }
  }

  async request(url, options = {}) {
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (this.accessToken) {
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);
      const data = await response.json();

      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          config.headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${url}`, config);
          return retryResponse.json();
        }
      }

      return data;
    } catch (error) {
      throw new Error(`Network error: ${error.message}`);
    }
  }

  async sendOTP(phoneNumber) {
    const response = await this.request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
    return response;
  }

  async verifyOTP(phoneNumber, otp) {
    const response = await this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp }),
    });

    if (response.success && response.accessToken && response.refreshToken) {
      await this.saveTokens(response.accessToken, response.refreshToken);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
      }
    }

    return response;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      await this.clearTokens();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.accessToken && data.refreshToken) {
        await this.saveTokens(data.accessToken, data.refreshToken);
        return true;
      }

      await this.clearTokens();
      return false;
    } catch (error) {
      await this.clearTokens();
      return false;
    }
  }

  async logout() {
    if (this.refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    await this.clearTokens();
  }

  async registerUser(formData) {
    const response = await fetch(`${API_BASE_URL}/api/user/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });
    return response.json();
  }

  async getUserProfile() {
    return await this.request('/api/user/me', {
      method: 'GET',
    });
  }

  async updateUserProfile(formData) {
    const response = await fetch(`${API_BASE_URL}/api/user/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: formData,
    });
    return response.json();
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

export default new ApiService();
```

---

### 2. Complete OTP Login Component

```jsx
// OTPLogin.jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function OTPLogin() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (api.isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  }, []);

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.sendOTP(phoneNumber);

      if (response.success) {
        setStep('otp');
        alert('OTP sent! Use 123456 in development mode');
      } else {
        setError(response.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.verifyOTP(phoneNumber, otp);

      if (response.success) {
        if (response.isNewUser) {
          window.location.href = '/register';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(response.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <div>
        <input
          type="tel"
          placeholder="+919876543210"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <button onClick={handleSendOTP} disabled={loading}>
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Enter 6-digit OTP (123456)"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        maxLength={6}
      />
      <button onClick={handleVerifyOTP} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
      <button onClick={() => setStep('phone')}>Change Number</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default OTPLogin;
```

---

### 3. Token Refresh Interceptor

```javascript
// tokenInterceptor.js
import api from './api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

export const setupTokenRefresh = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshed = await api.refreshAccessToken();
          if (refreshed) {
            processQueue(null, api.accessToken);
            originalRequest.headers['Authorization'] = `Bearer ${api.accessToken}`;
            return axiosInstance(originalRequest);
          } else {
            processQueue(new Error('Token refresh failed'), null);
            await api.logout();
            window.location.href = '/login';
            return Promise.reject(error);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          await api.logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};
```

---

### 4. User Profile Component

```jsx
// UserProfile.jsx
import React, { useState, useEffect } from 'react';
import api from './api';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    purpose: 'personal',
    showDate: true,
    language: 'english'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.getUserProfile();
      if (response.success) {
        setUser(response.user);
        setFormData({
          name: response.user.name || '',
          purpose: response.user.purpose || 'personal',
          showDate: response.user.showDate,
          language: response.user.language || 'english'
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const form = new FormData();
    
    Object.keys(formData).forEach(key => {
      if (formData[key] !== undefined) {
        form.append(key, formData[key]);
      }
    });

    if (e.target.profileImage.files[0]) {
      form.append('profileImage', e.target.profileImage.files[0]);
    }

    try {
      const response = await api.updateUserProfile(form);
      if (response.success) {
        setUser(response.user);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    window.location.href = '/login';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Profile</h1>
      <p>Phone: {user?.phoneNumber}</p>
      <p>Name: {user?.name || 'Not set'}</p>
      
      <form onSubmit={handleUpdate}>
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
        <select
          value={formData.purpose}
          onChange={(e) => setFormData({...formData, purpose: e.target.value})}
        >
          <option value="personal">Personal</option>
          <option value="business">Business</option>
        </select>
        <input type="file" name="profileImage" accept="image/*" />
        <button type="submit">Update Profile</button>
      </form>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default UserProfile;
```

---

## React Native Example

```jsx
// OTPLogin.js (React Native)
import React, { useState } from 'react';
import { View, TextInput, Button, Alert, AsyncStorage } from 'react-native';
import api from './api';

const OTPLogin = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');

  const sendOTP = async () => {
    try {
      const response = await api.sendOTP(phoneNumber);
      if (response.success) {
        Alert.alert('Success', 'OTP sent! Use 123456');
        setStep('otp');
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  const verifyOTP = async () => {
    try {
      const response = await api.verifyOTP(phoneNumber, otp);
      if (response.success) {
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        Alert.alert('Success', 'Login successful!');
        navigation.navigate('Home');
      } else {
        Alert.alert('Error', response.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    }
  };

  return (
    <View>
      {step === 'phone' ? (
        <>
          <TextInput
            placeholder="+919876543210"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <Button title="Send OTP" onPress={sendOTP} />
        </>
      ) : (
        <>
          <TextInput
            placeholder="Enter OTP (123456)"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button title="Verify OTP" onPress={verifyOTP} />
        </>
      )}
    </View>
  );
};
```

---

## Key Points

1. **Store both tokens:** `accessToken` and `refreshToken`
2. **Auto-refresh:** Implement token refresh when access token expires
3. **Secure storage:** Use secure storage (localStorage for web, AsyncStorage for React Native)
4. **Error handling:** Handle 401 errors and refresh tokens automatically
5. **Logout:** Always revoke refresh token on logout

---

## Environment Variables for Frontend

```javascript
// config.js
export const API_BASE_URL = 'https://psytech-backend.onrender.com';
export const DEV_OTP = '123456';
export const ACCESS_TOKEN_EXPIRY = 900; // 15 minutes
```

---

## Complete Flow Diagram

```
Login Flow:
1. User enters phone → sendOTP()
2. User enters OTP (123456) → verifyOTP()
3. Save accessToken + refreshToken
4. Use accessToken for API calls

Token Refresh Flow:
1. API call returns 401
2. Call refreshAccessToken()
3. Get new accessToken + refreshToken
4. Retry original API call
5. Update stored tokens

Logout Flow:
1. Call logout() with refreshToken
2. Clear all stored tokens
3. Redirect to login
```

---

---

## Photo Upload Guide

### Backend Requirements

- **File Size Limit:** 5MB per file
- **Allowed Types:** JPEG, JPG, PNG, GIF, WEBP
- **Field Names:** 
  - `profileImage` (for personal profiles)
  - `logo` (for business profiles)
- **Content-Type:** `multipart/form-data`

### React (Web) - Complete Example

```jsx
// PhotoUpload.jsx
import React, { useState, useRef } from 'react';
import api from './api';

const PhotoUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Validate file before selection
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, GIF, and WEBP images are allowed');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }
    
    return true;
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      setSelectedImage(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setSelectedImage(null);
      setPreview(null);
    }
  };

  // Upload profile image
  const handleUpload = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profileImage', selectedImage);
      formData.append('name', 'John Doe'); // Other fields if needed
      
      const response = await api.updateUserProfile(formData);
      
      if (response.success) {
        alert('Profile image uploaded successfully!');
        setSelectedImage(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Register user with image
  const handleRegister = async (userData) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(userData).forEach(key => {
      if (key !== 'profileImage' && key !== 'logo' && userData[key] !== undefined) {
        formData.append(key, userData[key]);
      }
    });

    // Add image if selected
    if (selectedImage) {
      formData.append('profileImage', selectedImage);
    }

    try {
      const response = await api.registerUser(formData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  return (
    <div>
      <h2>Upload Profile Image</h2>
      
      {error && <div style={{color: 'red'}}>{error}</div>}
      
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {preview && (
        <div>
          <img 
            src={preview} 
            alt="Preview" 
            style={{maxWidth: '200px', maxHeight: '200px', marginTop: '10px'}}
          />
          <p>File: {selectedImage.name} ({(selectedImage.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}

      <button 
        onClick={handleUpload} 
        disabled={!selectedImage || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  );
};

export default PhotoUpload;
```

### React Native - Complete Example

```jsx
// PhotoUpload.js (React Native)
import React, { useState } from 'react';
import { View, Image, Button, Alert, Text, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from './api';

const PhotoUpload = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Request permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return false;
    }
    return true;
  };

  // Pick image from gallery
  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file size (5MB limit)
        if (file.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 5MB');
          return;
        }

        setSelectedImage(file);
        setError(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        if (file.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 5MB');
          return;
        }

        setSelectedImage(file);
        setError(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  // Upload image
  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Append image file
      formData.append('profileImage', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      // Add other fields if needed
      formData.append('name', 'John Doe');

      const response = await api.updateUserProfile(formData);
      
      if (response.success) {
        Alert.alert('Success', 'Profile image uploaded successfully!');
        setSelectedImage(null);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
      Alert.alert('Error', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Upload Profile Image</Text>
      
      {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
      
      <View style={{ marginBottom: 10 }}>
        <Button title="Pick from Gallery" onPress={pickImage} disabled={uploading} />
      </View>
      
      <View style={{ marginBottom: 10 }}>
        <Button title="Take Photo" onPress={takePhoto} disabled={uploading} />
      </View>

      {selectedImage && (
        <View style={{ marginBottom: 10 }}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={{ width: 200, height: 200, marginBottom: 10 }}
          />
          <Text>File size: {(selectedImage.fileSize / 1024).toFixed(2)} KB</Text>
        </View>
      )}

      <Button
        title={uploading ? 'Uploading...' : 'Upload Image'}
        onPress={handleUpload}
        disabled={!selectedImage || uploading}
      />

      {uploading && <ActivityIndicator size="large" style={{ marginTop: 10 }} />}
    </View>
  );
};

export default PhotoUpload;
```

### API Service Methods for File Upload

```javascript
// api.js - Add these methods

async registerUser(formData) {
  const response = await fetch(`${API_BASE_URL}/api/user/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      // Don't set Content-Type, browser will set it with boundary
    },
    body: formData
  });

  if (!response.ok) {
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.registerUser(formData);
    }
    throw new Error('Registration failed');
  }

  return await response.json();
}

async updateUserProfile(formData) {
  const response = await fetch(`${API_BASE_URL}/api/user/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      // Don't set Content-Type for FormData
    },
    body: formData
  });

  if (!response.ok) {
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.updateUserProfile(formData);
    }
    throw new Error('Update failed');
  }

  return await response.json();
}
```

### Key Points for Photo Upload

1. **FormData:** Always use `FormData` for file uploads
2. **No Content-Type Header:** Let the browser set it automatically (includes boundary)
3. **File Validation:** Check size (5MB) and type (images only) before upload
4. **Preview:** Show image preview before uploading
5. **Error Handling:** Handle file size, type, and network errors
6. **Field Names:** Use `profileImage` for personal, `logo` for business
7. **Multiple Files:** Can upload both `profileImage` and `logo` in same request

### Complete Registration Example with Image

```jsx
// RegisterForm.jsx
const handleRegister = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('phoneNumber', phoneNumber);
  formData.append('name', name);
  formData.append('purpose', purpose);
  formData.append('showDate', showDate);
  formData.append('language', language);

  // Add profile image if selected
  if (profileImageFile) {
    formData.append('profileImage', profileImageFile);
  }

  // Add logo if business
  if (purpose === 'business' && logoFile) {
    formData.append('logo', logoFile);
  }

  try {
    const response = await api.registerUser(formData);
    if (response.success) {
      // Handle success
      console.log('User registered:', response.user);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

---

## Testing Checklist

- [ ] Send OTP with valid phone number
- [ ] Verify OTP with hardcoded 123456
- [ ] Store accessToken and refreshToken
- [ ] Make authenticated API calls
- [ ] Handle token expiration and refresh
- [ ] Logout and clear tokens
- [ ] Handle network errors gracefully
- [ ] Upload profile image (React web)
- [ ] Upload profile image (React Native)
- [ ] Validate file size and type before upload
- [ ] Show image preview before upload
- [ ] Handle upload errors gracefully

