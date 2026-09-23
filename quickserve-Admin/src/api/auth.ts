import api from './axios';
import { ApiResponse, User } from '../types';
import { getLocalRoleOverrides } from './users';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponseData {
  user: User;
  token: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export const authApi = {
  login: async (credentials: LoginPayload): Promise<LoginResponseData> => {
    const response = await api.post<ApiResponse<LoginResponseData>>(
      '/api/auth/login',
      credentials
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Login failed');
    }
    const data = response.data.data;
    const overrides = getLocalRoleOverrides();
    if (data?.user?.id && overrides[data.user.id]) {
      data.user.role = overrides[data.user.id];
    }
    return data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch current user');
    }
    const user = response.data.data;
    const overrides = getLocalRoleOverrides();
    if (user?.id && overrides[user.id]) {
      user.role = overrides[user.id];
    }
    return user;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<string> => {
    const response = await api.post<ApiResponse<{ message?: string }>>(
      '/api/auth/change-password',
      payload
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to change password');
    }
    return response.data.message || 'Password changed successfully';
  },

  register: async (payload: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  }): Promise<LoginResponseData> => {
    const response = await api.post<ApiResponse<LoginResponseData>>(
      '/api/auth/register',
      payload
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Registration failed');
    }
    return response.data.data;
  },
};

export default authApi;
