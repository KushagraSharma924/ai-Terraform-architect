import { apiClient } from './client';

export interface GenerateTerraformPayload {
  projectId: string;
  generationId: string;
  name: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  spec: any;
}

export const terraformApi = {
  generate: (data: GenerateTerraformPayload) =>
    apiClient.post('/terraform-projects/generate', data).then((r) => r.data),

  getProjectVersions: (projectId: string) =>
    apiClient.get(`/terraform-projects/project/${projectId}/versions`).then((r) => r.data),

  getVersionDetails: (versionId: string) =>
    apiClient.get(`/terraform-projects/version/${versionId}`).then((r) => r.data),

  getVersionFiles: (versionId: string) =>
    apiClient.get(`/terraform-projects/version/${versionId}/files`).then((r) => r.data),

  getFileContent: (versionId: string, path: string) =>
    apiClient
      .get(`/terraform-projects/version/${versionId}/file`, { params: { path } })
      .then((r) => r.data),

  getDiff: (fromVersionId: string, toVersionId: string) =>
    apiClient
      .get('/terraform-projects/diff', { params: { fromVersionId, toVersionId } })
      .then((r) => r.data),
};
