import { apiClient } from './client';

export const workspacesApi = {
  create: (name: string) =>
    apiClient.post('/workspaces', { name }).then((r) => r.data),

  list: () => apiClient.get('/workspaces').then((r) => r.data),

  get: (id: string) => apiClient.get(`/workspaces/${id}`).then((r) => r.data),

  update: (id: string, name: string) =>
    apiClient.patch(`/workspaces/${id}`, { name }).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/workspaces/${id}`).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient.get(`/workspaces/${id}/members`).then((r) => r.data),

  invite: (id: string, email: string, role: 'editor' | 'viewer') =>
    apiClient.post(`/workspaces/${id}/members/invite`, { email, role }).then((r) => r.data),

  acceptInvitation: (token: string) =>
    apiClient.post(`/workspaces/invitations/${token}/accept`).then((r) => r.data),

  updateMemberRole: (id: string, userId: string, role: 'editor' | 'viewer') =>
    apiClient.patch(`/workspaces/${id}/members/${userId}`, { role }).then((r) => r.data),

  removeMember: (id: string, userId: string) =>
    apiClient.delete(`/workspaces/${id}/members/${userId}`).then((r) => r.data),
};
