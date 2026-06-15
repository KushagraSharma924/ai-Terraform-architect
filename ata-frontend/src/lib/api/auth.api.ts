import { apiClient } from './client';
import type { AuthResponse } from '../../../ata-shared-types/src/auth/auth-tokens.types';

export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    apiClient.post('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }): Promise<AuthResponse> =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  me: () => apiClient.get('/auth/me').then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),
};
