import { apiClient } from './client';

export interface CreateGenerationPayload {
  projectId: string;
  prompt: string;
  cloudProviderHint?: 'aws' | 'azure' | 'gcp';
  provider?: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
}

export interface RefineGenerationPayload {
  prompt: string;
  provider?: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
}

export const generationsApi = {
  create: (payload: CreateGenerationPayload) =>
    apiClient.post('/generations', payload).then((r) => r.data),

  get: (id: string) =>
    apiClient.get(`/generations/${id}`).then((r) => r.data),

  getStatus: (id: string) =>
    apiClient.get(`/generations/${id}/status`).then((r) => r.data),

  listByProject: (projectId: string, page = 1, limit = 20) =>
    apiClient
      .get(`/projects/${projectId}/generations`, { params: { page, limit } })
      .then((r) => r.data),

  refine: (id: string, payload: RefineGenerationPayload) =>
    apiClient.post(`/generations/${id}/refine`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/generations/${id}`).then((r) => r.data),
};
