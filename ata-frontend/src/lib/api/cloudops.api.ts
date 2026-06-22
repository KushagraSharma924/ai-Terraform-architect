import { apiClient } from './client';

export const cloudopsApi = {
  getInventory: (cloudAccountId: string) =>
    apiClient.get(`/cloudops/inventory/${cloudAccountId}`).then((r) => r.data),
  refreshInventory: (cloudAccountId: string) =>
    apiClient.post(`/cloudops/inventory/${cloudAccountId}/refresh`).then((r) => r.data),
  costTrends: (cloudAccountId: string, days = 30) =>
    apiClient.get(`/cloudops/cost/${cloudAccountId}/trends`, { params: { days } }).then((r) => r.data),
  recommendations: () => apiClient.get('/cloudops/recommendations').then((r) => r.data),
  dismissRecommendation: (id: string) =>
    apiClient.post(`/cloudops/recommendations/${id}/dismiss`).then((r) => r.data),

  startConversation: (cloudAccountId: string) =>
    apiClient.post('/cloudops/conversations', { cloudAccountId }).then((r) => r.data),
  listConversations: () => apiClient.get('/cloudops/conversations').then((r) => r.data),
  getMessages: (id: string) => apiClient.get(`/cloudops/conversations/${id}/messages`).then((r) => r.data),
  ask: (id: string, message: string) =>
    apiClient.post(`/cloudops/conversations/${id}/messages`, { message }).then((r) => r.data),
};
