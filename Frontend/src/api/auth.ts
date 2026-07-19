// ============================================
// OASIS - Auth API Service
// - NO mock fallbacks — all calls go to the real backend
// ============================================

import { post, get, patch, setAccessToken, clearAuthTokens } from './client';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  User,
  UpdateUserRequest,
  UpdatePatientProfileRequest,
} from '@/types';

/** Register a new user */
export async function register(data: RegisterRequest): Promise<AuthResponse['data']> {
  const result = await post<AuthResponse['data']>('/auth/register', data);
  if (result.success && result.data) {
    setAccessToken(result.data.access_token);
    return result.data;
  }
  throw new Error('Registration failed');
}

/** Login */
export async function login(data: LoginRequest): Promise<AuthResponse['data']> {
  const result = await post<AuthResponse['data']>('/auth/login', data);
  if (result.success && result.data) {
    setAccessToken(result.data.access_token);
    return result.data;
  }
  throw new Error('Login failed');
}

/** Demo Login */
export async function demoLogin(role: string): Promise<AuthResponse['data']> {
  const result = await post<AuthResponse['data']>('/auth/demo', { role });
  if (result.success && result.data) {
    setAccessToken(result.data.access_token);
    return result.data;
  }
  throw new Error('Demo login failed');
}

/** Refresh token - Uses httpOnly cookie, no body needed */
export async function refreshToken(): Promise<{ access_token: string }> {
  const result = await post<{ access_token: string }>('/auth/refresh', {});
  if (result.success && result.data) {
    setAccessToken(result.data.access_token);
    return result.data;
  }
  throw new Error('Token refresh failed');
}

/** Logout */
export async function logout(): Promise<void> {
  try {
    await post('/auth/logout');
  } finally {
    clearAuthTokens();
  }
}

/** Forgot password */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
  const result = await post<{ message: string }>('/auth/forgot-password', data);
  return result.data;
}

/** Reset password */
export async function resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
  const result = await post<{ message: string }>('/auth/reset-password', data);
  return result.data;
}

/** Get current authenticated user profile */
export async function getMe(): Promise<User> {
  const result = await get<User>('/auth/me'); // Changed from /users/me to /auth/me to follow standard
  return result.data;
}

/** Update current user profile */
export async function updateMe(data: UpdateUserRequest): Promise<User> {
  const result = await patch<User>('/users/me', data);
  return result.data;
}

/** Update patient profile */
export async function updatePatientProfile(data: UpdatePatientProfileRequest): Promise<User> {
  const result = await patch<User>('/users/me/patient-profile', data);
  return result.data;
}
