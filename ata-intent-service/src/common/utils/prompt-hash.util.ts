import { createHash } from 'crypto';

export function computePromptHash(prompt: string, schemaVersion: string, providerHint = ''): string {
  const normalized = prompt.trim().toLowerCase();
  return createHash('sha256')
    .update(`${normalized}:${schemaVersion}:${providerHint.toLowerCase()}`)
    .digest('hex');
}
