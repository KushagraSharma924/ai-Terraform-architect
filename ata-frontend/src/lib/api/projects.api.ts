import { apiClient } from './client';

export const projectsApi = {
  create: (data: { workspaceId: string; name: string; description?: string }) =>
    apiClient.post('/projects', data).then((r) => r.data),

  listByWorkspace: (workspaceId: string, page = 1, limit = 20) =>
    apiClient
      .get(`/workspaces/${workspaceId}/projects`, { params: { page, limit } })
      .then((r) => r.data),

  get: (id: string) => apiClient.get(`/projects/${id}`).then((r) => r.data),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/projects/${id}`).then((r) => r.data),

  getUsageQuota: () => apiClient.get('/usage/quota').then((r) => r.data),
};
