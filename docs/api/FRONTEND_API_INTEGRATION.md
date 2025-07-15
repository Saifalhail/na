# Frontend API Integration Guide

Complete guide for integrating the Nutrition AI API with web frontend applications after backend simplification.

## Overview

This guide provides practical examples for integrating the simplified Nutrition AI API with modern web frameworks including React, Vue.js, and vanilla JavaScript.

**Base URL**: `http://127.0.0.1:8000/api/v1/` (dev) | `https://api.nutritionai.com/api/v1/` (prod)

## Backend Simplification Note

This guide reflects the simplified backend structure with 10 core models:
- **User, UserProfile** - Authentication and user data
- **FoodItem, Meal, MealItem** - Food and meal tracking
- **MealAnalysis** - AI analysis results
- **Notification, DeviceToken** - Push notifications
- **SubscriptionPlan, Subscription, Payment** - Premium features

**Removed Features**: Complex synchronization, batch operations, favorites management, 2FA, and SMS features have been removed for simplicity.

## Table of Contents

1. [Authentication Setup](#authentication-setup)
2. [API Client Configuration](#api-client-configuration)
3. [React Integration Examples](#react-integration-examples)
4. [Vue.js Integration Examples](#vuejs-integration-examples)
5. [Vanilla JavaScript Examples](#vanilla-javascript-examples)
6. [Image Upload & Analysis](#image-upload--analysis)
7. [Error Handling](#error-handling)
8. [State Management](#state-management)
9. [Testing](#testing)
10. [Performance Optimization](#performance-optimization)

---

## Authentication Setup

### JWT Token Management

```javascript
// Token management utility
class TokenManager {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/v1/auth/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.access, data.refresh || this.refreshToken);
      return data.access;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }
}

export const tokenManager = new TokenManager();
```

### Login/Logout Implementation

```javascript
// Authentication service
class AuthService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      tokenManager.setTokens(data.access_token, data.refresh_token);
      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      await fetch(`${this.baseUrl}/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.accessToken}`,
        },
        body: JSON.stringify({
          refresh: tokenManager.refreshToken,
        }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/registration/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export const authService = new AuthService('http://127.0.0.1:8000/api/v1');
```

---

## API Client Configuration

### Base API Client

```javascript
// API client with automatic token refresh
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    if (tokenManager.isAuthenticated()) {
      config.headers.Authorization = `Bearer ${tokenManager.accessToken}`;
    }

    try {
      let response = await fetch(url, config);

      // Handle token refresh
      if (response.status === 401 && tokenManager.refreshToken) {
        try {
          await tokenManager.refreshAccessToken();
          config.headers.Authorization = `Bearer ${tokenManager.accessToken}`;
          response = await fetch(url, config);
        } catch (refreshError) {
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Special method for form data (image uploads)
  async uploadFile(endpoint, formData, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${tokenManager.accessToken}`,
        ...options.headers,
      },
      ...options,
    };

    // Don't set Content-Type for FormData - let browser set it
    delete config.headers['Content-Type'];

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient('http://127.0.0.1:8000/api/v1');
```

---

## React Integration Examples

### Authentication Hook

```javascript
import { useState, useEffect, useContext, createContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (tokenManager.isAuthenticated()) {
        try {
          const userData = await apiClient.get('/users/profile/');
          setUser(userData);
        } catch (error) {
          console.error('Auth initialization failed:', error);
          tokenManager.clearTokens();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (userData) => {
    try {
      const data = await authService.register(userData);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Meal Management Hook

```javascript
import { useState, useEffect } from 'react';

export const useMeals = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMeals = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams(params);
      const data = await apiClient.get(`/meals/?${queryParams}`);
      setMeals(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createMeal = async (mealData) => {
    try {
      const newMeal = await apiClient.post('/meals/', mealData);
      setMeals(prev => [newMeal, ...prev]);
      return newMeal;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateMeal = async (mealId, mealData) => {
    try {
      const updatedMeal = await apiClient.put(`/meals/${mealId}/`, mealData);
      setMeals(prev => prev.map(meal => 
        meal.id === mealId ? updatedMeal : meal
      ));
      return updatedMeal;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteMeal = async (mealId) => {
    try {
      await apiClient.delete(`/meals/${mealId}/`);
      setMeals(prev => prev.filter(meal => meal.id !== mealId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const duplicateMeal = async (mealId, duplicateData) => {
    try {
      const duplicatedMeal = await apiClient.post(`/meals/${mealId}/duplicate/`, duplicateData);
      setMeals(prev => [duplicatedMeal, ...prev]);
      return duplicatedMeal;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  return {
    meals,
    loading,
    error,
    fetchMeals,
    createMeal,
    updateMeal,
    deleteMeal,
    duplicateMeal,
  };
};
```

### Image Analysis Hook

```javascript
import { useState } from 'react';

export const useImageAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const analyzeImage = async (imageFile, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('meal_type', options.meal_type || 'lunch');
      
      if (options.location_name) {
        formData.append('location_name', options.location_name);
      }
      
      if (options.latitude && options.longitude) {
        formData.append('latitude', options.latitude);
        formData.append('longitude', options.longitude);
      }

      const result = await apiClient.uploadFile('/ai/analyze/', formData);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const analyzeImageProgressive = async (imageFile, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('meal_type', options.meal_type || 'lunch');
      formData.append('target_confidence', options.target_confidence || 80);

      // Start progressive analysis
      const startResult = await apiClient.uploadFile('/ai/progressive-analyze/', formData);
      const sessionId = startResult.session_id;

      // Poll for completion
      return await pollAnalysisStatus(sessionId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const pollAnalysisStatus = async (sessionId) => {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await apiClient.get(`/ai/progressive-status/${sessionId}/`);
        
        setProgress(status.progress);
        
        if (status.status === 'completed') {
          return status;
        } else if (status.status === 'failed') {
          throw new Error('Analysis failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (err) {
        throw err;
      }
    }

    throw new Error('Analysis timeout');
  };

  const recalculateNutrition = async (mealId, mealItems) => {
    try {
      const result = await apiClient.post('/ai/recalculate/', {
        meal_id: mealId,
        meal_items: mealItems,
      });
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    loading,
    error,
    progress,
    analyzeImage,
    analyzeImageProgressive,
    recalculateNutrition,
  };
};
```

### User Profile Hook

```javascript
import { useState, useEffect } from 'react';

export const useUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.get('/users/profile/');
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedProfile = await apiClient.put('/users/profile/', profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getUserStats = async (userId) => {
    try {
      const stats = await apiClient.get(`/users/${userId}/stats/`);
      return stats;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    getUserStats,
  };
};
```

---

## Vue.js Integration Examples

### Authentication Store (Pinia)

```javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  const login = async (email, password) => {
    loading.value = true;
    error.value = null;
    
    try {
      const data = await authService.login(email, password);
      user.value = data.user;
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      user.value = null;
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const register = async (userData) => {
    loading.value = true;
    error.value = null;
    
    try {
      const data = await authService.register(userData);
      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const initAuth = async () => {
    if (tokenManager.isAuthenticated()) {
      try {
        const userData = await apiClient.get('/users/profile/');
        user.value = userData;
      } catch (err) {
        tokenManager.clearTokens();
        console.error('Auth initialization failed:', err);
      }
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    register,
    initAuth,
  };
});
```

### Meal Management Store

```javascript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMealStore = defineStore('meals', () => {
  const meals = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchMeals = async (params = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const queryParams = new URLSearchParams(params);
      const data = await apiClient.get(`/meals/?${queryParams}`);
      meals.value = data.results;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createMeal = async (mealData) => {
    try {
      const newMeal = await apiClient.post('/meals/', mealData);
      meals.value.unshift(newMeal);
      return newMeal;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const updateMeal = async (mealId, mealData) => {
    try {
      const updatedMeal = await apiClient.put(`/meals/${mealId}/`, mealData);
      const index = meals.value.findIndex(meal => meal.id === mealId);
      if (index !== -1) {
        meals.value[index] = updatedMeal;
      }
      return updatedMeal;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  const deleteMeal = async (mealId) => {
    try {
      await apiClient.delete(`/meals/${mealId}/`);
      meals.value = meals.value.filter(meal => meal.id !== mealId);
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  return {
    meals,
    loading,
    error,
    fetchMeals,
    createMeal,
    updateMeal,
    deleteMeal,
  };
});
```

### Vue Component Example

```vue
<template>
  <div class="meal-analysis">
    <div class="upload-section">
      <input 
        type="file" 
        @change="handleFileSelect" 
        accept="image/*"
        ref="fileInput"
      />
      <button @click="analyzeImage" :disabled="!selectedFile || loading">
        {{ loading ? 'Analyzing...' : 'Analyze Food' }}
      </button>
    </div>

    <div v-if="loading" class="progress">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      <span>{{ progress }}%</span>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="result" class="result">
      <h3>{{ result.meal.name }}</h3>
      <p>Calories: {{ result.meal.total_calories }}</p>
      <p>Protein: {{ result.meal.total_protein }}g</p>
      <p>Carbs: {{ result.meal.total_carbs }}g</p>
      <p>Fat: {{ result.meal.total_fat }}g</p>
      
      <div class="meal-items">
        <h4>Detected Items:</h4>
        <ul>
          <li v-for="item in result.meal.meal_items" :key="item.id">
            {{ item.food_item_name }} - {{ item.quantity }}{{ item.unit }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useImageAnalysis } from '../composables/useImageAnalysis';

export default {
  name: 'MealAnalysis',
  setup() {
    const selectedFile = ref(null);
    const fileInput = ref(null);
    const result = ref(null);
    
    const { loading, error, progress, analyzeImage: analyze } = useImageAnalysis();

    const handleFileSelect = (event) => {
      selectedFile.value = event.target.files[0];
    };

    const analyzeImage = async () => {
      if (!selectedFile.value) return;

      try {
        const analysisResult = await analyze(selectedFile.value, {
          meal_type: 'lunch',
        });
        result.value = analysisResult;
      } catch (err) {
        console.error('Analysis failed:', err);
      }
    };

    return {
      selectedFile,
      fileInput,
      result,
      loading,
      error,
      progress,
      handleFileSelect,
      analyzeImage,
    };
  },
};
</script>

<style scoped>
.meal-analysis {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.upload-section {
  margin-bottom: 20px;
}

.progress {
  margin: 20px 0;
}

.progress-bar {
  height: 20px;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.error {
  color: red;
  margin: 10px 0;
}

.result {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.meal-items {
  margin-top: 15px;
}
</style>
```

---

## Vanilla JavaScript Examples

### Simple Authentication

```javascript
// Simple auth implementation
class SimpleAuth {
  constructor() {
    this.user = null;
    this.init();
  }

  async init() {
    if (tokenManager.isAuthenticated()) {
      try {
        this.user = await apiClient.get('/users/profile/');
        this.onAuthStateChange(this.user);
      } catch (error) {
        tokenManager.clearTokens();
      }
    }
  }

  async login(email, password) {
    try {
      const data = await authService.login(email, password);
      this.user = data.user;
      this.onAuthStateChange(this.user);
      return data;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    await authService.logout();
    this.user = null;
    this.onAuthStateChange(null);
  }

  onAuthStateChange(user) {
    // Override this method to handle auth state changes
    console.log('Auth state changed:', user);
  }

  isAuthenticated() {
    return !!this.user;
  }
}

// Usage
const auth = new SimpleAuth();

auth.onAuthStateChange = (user) => {
  if (user) {
    document.getElementById('user-info').textContent = `Welcome, ${user.first_name}!`;
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
  } else {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
  }
};

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    await auth.login(email, password);
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});
```

### Image Analysis Implementation

```javascript
// Image analysis functionality
class ImageAnalyzer {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    const fileInput = document.getElementById('image-input');
    const analyzeBtn = document.getElementById('analyze-btn');

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.displayPreview(file);
        analyzeBtn.disabled = false;
      }
    });

    analyzeBtn.addEventListener('click', () => {
      const file = fileInput.files[0];
      if (file) {
        this.analyzeImage(file);
      }
    });
  }

  displayPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('image-preview');
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  async analyzeImage(file) {
    const analyzeBtn = document.getElementById('analyze-btn');
    const progressDiv = document.getElementById('progress');
    const resultDiv = document.getElementById('result');
    
    analyzeBtn.disabled = true;
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = '';

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('meal_type', 'lunch');

      const result = await apiClient.uploadFile('/ai/analyze/', formData);
      this.displayResult(result);
    } catch (error) {
      resultDiv.innerHTML = `<div class="error">Analysis failed: ${error.message}</div>`;
    } finally {
      analyzeBtn.disabled = false;
      progressDiv.style.display = 'none';
    }
  }

  displayResult(result) {
    const resultDiv = document.getElementById('result');
    const meal = result.meal;
    
    resultDiv.innerHTML = `
      <h3>${meal.name}</h3>
      <div class="nutrition-info">
        <p><strong>Calories:</strong> ${meal.total_calories}</p>
        <p><strong>Protein:</strong> ${meal.total_protein}g</p>
        <p><strong>Carbs:</strong> ${meal.total_carbs}g</p>
        <p><strong>Fat:</strong> ${meal.total_fat}g</p>
      </div>
      <div class="meal-items">
        <h4>Detected Items:</h4>
        <ul>
          ${meal.meal_items.map(item => `
            <li>${item.food_item_name} - ${item.quantity}${item.unit}</li>
          `).join('')}
        </ul>
      </div>
      <div class="analysis-info">
        <p><strong>Confidence:</strong> ${result.analysis.confidence_overall}%</p>
        <p><strong>Processing Time:</strong> ${result.analysis.processing_time}s</p>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ImageAnalyzer();
});
```

---

## Image Upload & Analysis

### File Upload Component (React)

```javascript
import React, { useState, useRef } from 'react';

const ImageUploader = ({ onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('meal_type', 'lunch');

      // Simulate progress (in real app, you might use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await apiClient.uploadFile('/ai/analyze/', formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      onAnalysisComplete(result);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-uploader">
      <div className="upload-area">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        
        {!preview ? (
          <div 
            className="upload-placeholder"
            onClick={() => fileInputRef.current?.click()}
          >
            <p>Click to select an image</p>
          </div>
        ) : (
          <div className="preview-container">
            <img src={preview} alt="Preview" className="preview-image" />
            <button onClick={resetUpload} className="reset-button">
              Change Image
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span>{progress}%</span>
        </div>
      )}

      <button 
        onClick={handleUpload}
        disabled={!selectedFile || loading}
        className="upload-button"
      >
        {loading ? 'Analyzing...' : 'Analyze Food'}
      </button>
    </div>
  );
};

export default ImageUploader;
```

### Image Compression Utility

```javascript
// Image compression utility
class ImageCompressor {
  static compress(file, quality = 0.7, maxWidth = 1024, maxHeight = 1024) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        }, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static async compressForUpload(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (file.size <= maxSize) {
      return file;
    }

    // Compress with different qualities until under size limit
    const qualities = [0.8, 0.6, 0.4, 0.2];
    
    for (const quality of qualities) {
      const compressed = await this.compress(file, quality);
      if (compressed.size <= maxSize) {
        return compressed;
      }
    }

    throw new Error('Unable to compress image to acceptable size');
  }
}

// Usage in upload function
const handleFileUpload = async (file) => {
  try {
    const compressedFile = await ImageCompressor.compressForUpload(file);
    
    const formData = new FormData();
    formData.append('image', compressedFile);
    formData.append('meal_type', 'lunch');

    const result = await apiClient.uploadFile('/ai/analyze/', formData);
    return result;
  } catch (error) {
    throw new Error('Upload failed: ' + error.message);
  }
};
```

---

## Error Handling

### Global Error Handler

```javascript
// Global error handling
class ErrorHandler {
  static handle(error, context = '') {
    console.error(`Error in ${context}:`, error);

    // Different handling based on error type
    if (error.message.includes('Authentication')) {
      this.handleAuthError();
    } else if (error.message.includes('Network')) {
      this.handleNetworkError(error);
    } else if (error.message.includes('Validation')) {
      this.handleValidationError(error);
    } else {
      this.handleGenericError(error);
    }
  }

  static handleAuthError() {
    tokenManager.clearTokens();
    window.location.href = '/login';
  }

  static handleNetworkError(error) {
    this.showNotification('Network error. Please check your connection.', 'error');
  }

  static handleValidationError(error) {
    this.showNotification('Please check your input and try again.', 'warning');
  }

  static handleGenericError(error) {
    this.showNotification('An unexpected error occurred.', 'error');
  }

  static showNotification(message, type = 'info') {
    // Implementation depends on your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Usage in API calls
const safeApiCall = async (apiCall, context = '') => {
  try {
    return await apiCall();
  } catch (error) {
    ErrorHandler.handle(error, context);
    throw error;
  }
};

// Example usage
const fetchUserProfile = () => safeApiCall(
  () => apiClient.get('/users/profile/'),
  'fetchUserProfile'
);
```

### Error Boundary (React)

```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService(error, errorInfo) {
    // Send to monitoring service like Sentry
    console.log('Logging error to service:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## State Management

### Context API Implementation (React)

```javascript
import React, { createContext, useContext, useReducer } from 'react';

// Actions
const ACTIONS = {
  SET_USER: 'SET_USER',
  SET_MEALS: 'SET_MEALS',
  ADD_MEAL: 'ADD_MEAL',
  UPDATE_MEAL: 'UPDATE_MEAL',
  DELETE_MEAL: 'DELETE_MEAL',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_USER:
      return { ...state, user: action.payload };
    
    case ACTIONS.SET_MEALS:
      return { ...state, meals: action.payload };
    
    case ACTIONS.ADD_MEAL:
      return { ...state, meals: [action.payload, ...state.meals] };
    
    case ACTIONS.UPDATE_MEAL:
      return {
        ...state,
        meals: state.meals.map(meal =>
          meal.id === action.payload.id ? action.payload : meal
        ),
      };
    
    case ACTIONS.DELETE_MEAL:
      return {
        ...state,
        meals: state.meals.filter(meal => meal.id !== action.payload),
      };
    
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };
    
    default:
      return state;
  }
};

// Initial state
const initialState = {
  user: null,
  meals: [],
  loading: false,
  error: null,
};

// Context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const setUser = (user) => dispatch({ type: ACTIONS.SET_USER, payload: user });
  const setMeals = (meals) => dispatch({ type: ACTIONS.SET_MEALS, payload: meals });
  const addMeal = (meal) => dispatch({ type: ACTIONS.ADD_MEAL, payload: meal });
  const updateMeal = (meal) => dispatch({ type: ACTIONS.UPDATE_MEAL, payload: meal });
  const deleteMeal = (mealId) => dispatch({ type: ACTIONS.DELETE_MEAL, payload: mealId });
  const setLoading = (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  const setError = (error) => dispatch({ type: ACTIONS.SET_ERROR, payload: error });

  const value = {
    ...state,
    setUser,
    setMeals,
    addMeal,
    updateMeal,
    deleteMeal,
    setLoading,
    setError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
```

---

## Testing

### API Client Tests

```javascript
// __tests__/apiClient.test.js
import { apiClient } from '../src/services/apiClient';

// Mock fetch
global.fetch = jest.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should make GET request with auth header', async () => {
    const mockResponse = { data: 'test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient.get('/test');

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/v1/test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('should handle 401 error and refresh token', async () => {
    // Mock 401 response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    });

    // Mock successful refresh
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access: 'new-token' }),
    });

    // Mock successful retry
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'success' }),
    });

    const result = await apiClient.get('/test');

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ data: 'success' });
  });

  it('should handle upload with FormData', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', mockFile);

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await apiClient.uploadFile('/upload', formData);

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/v1/upload',
      expect.objectContaining({
        method: 'POST',
        body: formData,
      })
    );

    expect(result).toEqual({ success: true });
  });
});
```

### React Hook Tests

```javascript
// __tests__/hooks/useImageAnalysis.test.js
import { renderHook, act } from '@testing-library/react';
import { useImageAnalysis } from '../../src/hooks/useImageAnalysis';

jest.mock('../../src/services/apiClient');

describe('useImageAnalysis', () => {
  it('should analyze image successfully', async () => {
    const mockResult = {
      meal: { id: 1, name: 'Test Meal' },
      analysis: { confidence_overall: 85 },
    };

    apiClient.uploadFile.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useImageAnalysis());

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      const analysisResult = await result.current.analyzeImage(mockFile);
      expect(analysisResult).toEqual(mockResult);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle analysis error', async () => {
    const mockError = new Error('Analysis failed');
    apiClient.uploadFile.mockRejectedValue(mockError);

    const { result } = renderHook(() => useImageAnalysis());

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await act(async () => {
      try {
        await result.current.analyzeImage(mockFile);
      } catch (error) {
        expect(error).toBe(mockError);
      }
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Analysis failed');
  });
});
```

---

## Performance Optimization

### Request Caching

```javascript
// Simple request cache
class RequestCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  generateKey(url, options) {
    return `${url}:${JSON.stringify(options)}`;
  }

  get(url, options) {
    const key = this.generateKey(url, options);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    this.cache.delete(key);
    return null;
  }

  set(url, options, data) {
    const key = this.generateKey(url, options);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Enhanced API client with caching
class CachedApiClient extends ApiClient {
  constructor(baseUrl) {
    super(baseUrl);
    this.cache = new RequestCache();
  }

  async get(endpoint, options = {}) {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey, options);

    if (cached) {
      return cached;
    }

    const result = await super.get(endpoint, options);
    this.cache.set(cacheKey, options, result);
    return result;
  }
}
```

### Debounced Search

```javascript
// Debounced search hook
import { useState, useEffect, useCallback } from 'react';

export const useDebouncedSearch = (searchFunction, delay = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await searchFunction(searchQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, delay),
    [searchFunction, delay]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
};

// Debounce utility
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}
```

### Lazy Loading

```javascript
// Lazy loading component
import React, { useState, useEffect, useRef } from 'react';

const LazyMealList = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observer = useRef();

  const lastMealElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    const loadMeals = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(`/meals/?page=${page}`);
        
        if (page === 1) {
          setMeals(response.results);
        } else {
          setMeals(prev => [...prev, ...response.results]);
        }
        
        setHasMore(!!response.next);
      } catch (error) {
        console.error('Failed to load meals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMeals();
  }, [page]);

  return (
    <div className="meal-list">
      {meals.map((meal, index) => (
        <div
          key={meal.id}
          ref={index === meals.length - 1 ? lastMealElementRef : null}
          className="meal-item"
        >
          <h3>{meal.name}</h3>
          <p>{meal.total_calories} calories</p>
        </div>
      ))}
      {loading && <div className="loading">Loading more meals...</div>}
    </div>
  );
};
```

---

## Related Documentation

- [API_REFERENCE.md](./API_REFERENCE.md) - Complete API documentation
- [SIMPLIFIED_API_GUIDE.md](./SIMPLIFIED_API_GUIDE.md) - Core endpoints guide
- [MOBILE_API_GUIDE.md](./MOBILE_API_GUIDE.md) - Mobile integration guide
- [ENHANCED_POSTMAN_GUIDE.md](./ENHANCED_POSTMAN_GUIDE.md) - Postman testing guide

---

*Last Updated: July 15, 2025*
*Version: 1.0.0 - Simplified Backend*