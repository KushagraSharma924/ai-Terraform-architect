import { apiClient } from './client';

export const exportApi = {
  requestExport: (versionId: string, type = 'zip') =>
    apiClient.post(`/exports/version/${versionId}`, null, { params: { type } }).then((r) => r.data),
  getArtifact: (artifactId: string) => apiClient.get(`/exports/${artifactId}`).then((r) => r.data),
  listForVersion: (versionId: string) =>
    apiClient.get(`/exports/version/${versionId}`).then((r) => r.data),
  rollback: (versionId: string) =>
    apiClient.post(`/terraform-projects/version/${versionId}/rollback`).then((r) => r.data),
  downloadUrl: (artifactId: string) =>
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1/exports/${artifactId}/download`,
};
