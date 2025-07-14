# API Integration Guide

## Overview

This document describes how the Nutrition AI frontend integrates with the backend API, including authentication, data fetching, error handling, and offline support.

## API Configuration

### Base Configuration

```typescript
// src/services/api/config.ts
export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000",
  version: process.env.EXPO_PUBLIC_API_VERSION || "v1",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseURL}/api/${API_CONFIG.version}${endpoint}`;
};
```

## Authentication Flow

### Token Management

The app uses JWT tokens with automatic refresh:

```typescript
// src/services/api/auth.ts
interface TokenPair {
  access: string;
  refresh: string;
}

interface AuthResponse {
  user: User;
  tokens: TokenPair;
}
```

### Authentication States

1. **Unauthenticated**: No tokens stored
2. **Authenticated**: Valid access token
3. **Refreshing**: Access token expired, refreshing with refresh token
4. **Expired**: Both tokens expired, user must login again

### Token Storage

Tokens are securely stored using Expo SecureStore:

```typescript
// src/services/storage/secureStorage.ts
import * as SecureStore from "expo-secure-store";

export const TokenStorage = {
  async saveTokens(tokens: TokenPair): Promise<void> {
    await SecureStore.setItemAsync("access_token", tokens.access);
    await SecureStore.setItemAsync("refresh_token", tokens.refresh);
  },

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("access_token");
  },

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync("refresh_token");
  },

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
  },
};
```

## API Client Setup

### Axios Instance

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (refreshToken) {
          const response = await authApi.refreshToken(refreshToken);
          await TokenStorage.saveTokens(response.tokens);

          originalRequest.headers.Authorization = `Bearer ${response.tokens.access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await TokenStorage.clearTokens();
        // Navigate to login
      }
    }

    return Promise.reject(error);
  },
);
```

## API Endpoints

### Authentication Endpoints

```typescript
// src/services/api/endpoints/auth.ts
export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/register/", data);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post("/auth/login/", credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    const refreshToken = await TokenStorage.getRefreshToken();
    await apiClient.post("/auth/logout/", { refresh: refreshToken });
    await TokenStorage.clearTokens();
  },

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const response = await apiClient.post("/auth/refresh/", {
      refresh: refreshToken,
    });
    return response.data;
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post("/auth/verify-email/", { token });
  },

  async resetPassword(email: string): Promise<void> {
    await apiClient.post("/auth/password/reset/", { email });
  },

  async confirmResetPassword(data: ResetPasswordData): Promise<void> {
    await apiClient.post("/auth/password/reset/confirm/", data);
  },

  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get("/auth/profile/");
    return response.data;
  },

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.put("/auth/profile/", data);
    return response.data;
  },
};
```

### AI Analysis Endpoints

```typescript
// src/services/api/endpoints/ai.ts
export const aiApi = {
  async analyzeImage(imageData: AnalysisData): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append("image", {
      uri: imageData.imageUri,
      type: "image/jpeg",
      name: "meal.jpg",
    } as any);

    if (imageData.metadata) {
      formData.append("metadata", JSON.stringify(imageData.metadata));
    }

    const response = await apiClient.post("/ai/analyze/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async recalculateNutrition(data: RecalculateData): Promise<NutritionData> {
    const response = await apiClient.post("/ai/recalculate/", data);
    return response.data;
  },
};
```

### Meal Management Endpoints

```typescript
// src/services/api/endpoints/meals.ts
export const mealsApi = {
  async getMeals(params?: MealFilters): Promise<PaginatedResponse<Meal>> {
    const response = await apiClient.get("/meals/", { params });
    return response.data;
  },

  async getMeal(id: string): Promise<Meal> {
    const response = await apiClient.get(`/meals/${id}/`);
    return response.data;
  },

  async createMeal(data: CreateMealData): Promise<Meal> {
    const response = await apiClient.post("/meals/", data);
    return response.data;
  },

  async updateMeal(id: string, data: Partial<Meal>): Promise<Meal> {
    const response = await apiClient.patch(`/meals/${id}/`, data);
    return response.data;
  },

  async deleteMeal(id: string): Promise<void> {
    await apiClient.delete(`/meals/${id}/`);
  },

  async toggleFavorite(id: string): Promise<void> {
    await apiClient.post(`/meals/${id}/favorite/`);
  },

  async getFavorites(): Promise<Meal[]> {
    const response = await apiClient.get("/meals/favorites/");
    return response.data;
  },

  async duplicateMeal(id: string): Promise<Meal> {
    const response = await apiClient.post(`/meals/${id}/duplicate/`);
    return response.data;
  },

  async quickLogMeal(mealId: string): Promise<Meal> {
    const response = await apiClient.post("/meals/quick_log/", {
      meal_id: mealId,
    });
    return response.data;
  },

  async getMealStatistics(): Promise<MealStatistics> {
    const response = await apiClient.get("/meals/statistics/");
    return response.data;
  },
};
```

## Error Handling

### Error Types

```typescript
// src/services/api/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string = "Network connection failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends ApiError {
  constructor(public fields: Record<string, string[]>) {
    super(400, "VALIDATION_ERROR", "Validation failed", fields);
  }
}
```

### Error Handler

```typescript
// src/services/api/errorHandler.ts
export const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error
    const { status, data } = error.response;

    if (status === 400 && data.errors) {
      throw new ValidationError(data.errors);
    }

    throw new ApiError(
      status,
      data.code || "UNKNOWN_ERROR",
      data.message || "An error occurred",
      data.details,
    );
  } else if (error.request) {
    // Request made but no response
    throw new NetworkError();
  } else {
    // Something else happened
    throw new Error(error.message);
  }
};
```

## Offline Support

### Request Queue

```typescript
// src/services/api/offlineQueue.ts
interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedRequest[] = [];

  async add(request: Omit<QueuedRequest, "id" | "timestamp">): Promise<void> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: generateId(),
      timestamp: Date.now(),
    };

    this.queue.push(queuedRequest);
    await this.persist();
  }

  async process(): Promise<void> {
    const requests = [...this.queue];

    for (const request of requests) {
      try {
        await apiClient({
          method: request.method,
          url: request.url,
          data: request.data,
        });

        await this.remove(request.id);
      } catch (error) {
        console.error("Failed to process queued request:", error);
      }
    }
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem("offline_queue", JSON.stringify(this.queue));
  }

  private async load(): Promise<void> {
    const data = await AsyncStorage.getItem("offline_queue");
    if (data) {
      this.queue = JSON.parse(data);
    }
  }
}
```

## Data Caching

### Cache Strategy

```typescript
// src/services/api/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

## Rate Limiting

### Client-Side Rate Limiting

```typescript
// src/services/api/rateLimiter.ts
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export class RateLimiter {
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {}

  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests
    this.requests = this.requests.filter((time) => time > windowStart);

    return this.requests.length < this.config.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

// Usage
const aiRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minute
});
```

## Type Definitions

### API Response Types

```typescript
// src/types/api.ts
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  errors?: Record<string, string[]>;
}
```

### Model Types

```typescript
// src/types/models.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: "free" | "premium" | "professional";
  isVerified: boolean;
  dateJoined: string;
}

export interface UserProfile {
  user: User;
  gender?: "male" | "female" | "other";
  height?: number;
  weight?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dietaryRestrictions: DietaryRestriction[];
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatGoal?: number;
  timezone: string;
  measurementSystem: "metric" | "imperial";
  bmi?: number;
  bmr?: number;
  tdee?: number;
}

export interface Meal {
  id: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  consumedAt: string;
  image?: string;
  notes?: string;
  location?: string;
  mealItems: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
}

export interface MealItem {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
```

## Best Practices

1. **Always Handle Errors**: Use try-catch blocks and display user-friendly messages
2. **Show Loading States**: Indicate when API calls are in progress
3. **Implement Retry Logic**: Automatically retry failed requests with exponential backoff
4. **Cache Responses**: Cache frequently accessed data to reduce API calls
5. **Validate Input**: Validate data client-side before sending to API
6. **Use TypeScript**: Ensure all API calls are fully typed
7. **Monitor Performance**: Track API response times and errors
8. **Handle Offline**: Queue requests when offline and sync when connected
