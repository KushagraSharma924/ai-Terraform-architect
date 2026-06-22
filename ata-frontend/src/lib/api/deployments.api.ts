import { apiClient } from './client';

export interface CloudAccount {
  id: string;
  provider: string;
  authMethod: string;
  roleArn?: string;
  externalId?: string;
  defaultRegion: string;
  status: string;
}

export interface Deployment {
  id: string;
  cloudAccountId: string;
  projectVersionId: string;
  environment: string;
  state: string;
  planSummary?: { add: number; change: number; destroy: number };
  costEstimate?: { monthlyUsd: number; currency: string };
  error?: string;
  createdAt: string;
}

export const deploymentsApi = {
  listAccounts: (): Promise<CloudAccount[]> =>
    apiClient.get('/cloud-accounts').then((r) => r.data),
  connectAccount: (data: { authMethod: 'assume_role' | 'oidc'; roleArn?: string; defaultRegion?: string }) =>
    apiClient.post('/cloud-accounts', data).then((r) => r.data),
  verifyAccount: (id: string) => apiClient.post(`/cloud-accounts/${id}/verify`).then((r) => r.data),
  setGuardrail: (data: { monthlyLimitUsd?: number; perDeployLimitUsd?: number; action: 'warn' | 'block' }) =>
    apiClient.post('/cloud-accounts/guardrails', data).then((r) => r.data),

  create: (data: { cloudAccountId: string; projectVersionId: string; environment?: string }): Promise<Deployment> =>
    apiClient.post('/deployments', data).then((r) => r.data),
  get: (id: string): Promise<Deployment> => apiClient.get(`/deployments/${id}`).then((r) => r.data),
  plan: (id: string) => apiClient.post(`/deployments/${id}/plan`).then((r) => r.data),
  approve: (id: string) => apiClient.post(`/deployments/${id}/approve`).then((r) => r.data),
  apply: (id: string) => apiClient.post(`/deployments/${id}/apply`).then((r) => r.data),
  destroy: (id: string) => apiClient.post(`/deployments/${id}/destroy`).then((r) => r.data),
  rollback: (id: string) => apiClient.post(`/deployments/${id}/rollback`).then((r) => r.data),
  events: (id: string) => apiClient.get(`/deployments/${id}/events`).then((r) => r.data),
  runs: (id: string) => apiClient.get(`/deployments/${id}/runs`).then((r) => r.data),
};
