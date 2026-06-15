export function redactPii(text: string): string {
  if (!text) return text;
  let redacted = text;

  // Emails
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

  // Phone numbers (simple match)
  redacted = redacted.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[REDACTED_PHONE]');

  // AWS Account IDs (12 digits)
  redacted = redacted.replace(/\b\d{12}\b/g, '[REDACTED_AWS_ACCOUNT]');

  // AWS Access Keys (AKIA/ASIA + 16 chars)
  redacted = redacted.replace(/\b(A[SK]IA[A-Z0-9]{16})\b/g, '[REDACTED_AWS_KEY]');

  return redacted;
}

export function redactObjectPii(obj: any): any {
  if (!obj) return obj;
  const str = JSON.stringify(obj);
  const redactedStr = redactPii(str);
  return JSON.parse(redactedStr);
}
