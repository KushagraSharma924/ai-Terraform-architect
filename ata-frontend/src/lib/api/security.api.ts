import { apiClient } from './client';

export const securityApi = {
  createScan: (data: { targetType: 'project_version' | 'deployment'; targetId: string }) =>
    apiClient.post('/scans', data).then((r) => r.data),
  getScan: (id: string) => apiClient.get(`/scans/${id}`).then((r) => r.data),
  findings: (id: string) => apiClient.get(`/scans/${id}/findings`).then((r) => r.data),
  compliance: (id: string, framework?: string) =>
    apiClient.get(`/scans/${id}/compliance`, { params: framework ? { framework } : {} }).then((r) => r.data),
  suppress: (data: { ruleId: string; resource?: string; reason: string; expiresAt?: string }) =>
    apiClient.post('/scans/findings/suppress', data).then((r) => r.data),
  gate: (versionId: string) => apiClient.get(`/scans/gate/${versionId}`).then((r) => r.data),
};
