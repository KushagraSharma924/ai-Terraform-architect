import { apiClient } from './client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export const orgApi = {
  create: (name: string) => apiClient.post('/orgs', { name }).then((r) => r.data),
  listMine: () => apiClient.get('/orgs').then((r) => r.data),
  get: (id: string) => apiClient.get(`/orgs/${id}`).then((r) => r.data),

  members: (id: string) => apiClient.get(`/orgs/${id}/members`).then((r) => r.data),
  invite: (id: string, data: { userId: string; role: string }) =>
    apiClient.post(`/orgs/${id}/members`, data).then((r) => r.data),
  updateRole: (id: string, memberId: string, role: string) =>
    apiClient.patch(`/orgs/${id}/members/${memberId}`, { role }).then((r) => r.data),
  removeMember: (id: string, memberId: string) =>
    apiClient.delete(`/orgs/${id}/members/${memberId}`).then((r) => r.data),

  teams: (id: string) => apiClient.get(`/orgs/${id}/teams`).then((r) => r.data),
  createTeam: (id: string, name: string) =>
    apiClient.post(`/orgs/${id}/teams`, { name }).then((r) => r.data),

  audit: (id: string) => apiClient.get(`/orgs/${id}/audit-logs`).then((r) => r.data),
  activity: (id: string) => apiClient.get(`/orgs/${id}/activity`).then((r) => r.data),

  setApprovalPolicy: (id: string, requiredApprovers: number) =>
    apiClient.post(`/orgs/${id}/approval-policies`, { requiredApprovers }).then((r) => r.data),

  notifications: () => apiClient.get('/notifications').then((r) => r.data),
  markRead: (id: string) => apiClient.post(`/notifications/${id}/read`).then((r) => r.data),
};
