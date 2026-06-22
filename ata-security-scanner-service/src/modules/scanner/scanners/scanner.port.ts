export const SCANNER_PORT = 'SCANNER_PORT';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ScanFile {
  path: string;
  content: string;
}

export interface RawFinding {
  scanner: string;
  ruleId: string;
  severity: Severity;
  resource?: string;
  filePath?: string;
  line?: number;
  message: string;
  remediation?: string;
}

/**
 * A static analyzer over Terraform source. The heuristic adapter is the default
 * (zero external deps). Checkov/tfsec/OPA adapters implement the same interface
 * and run as sandboxed CLI binaries in production.
 */
export interface ScannerPort {
  readonly name: string;
  scan(files: ScanFile[]): Promise<RawFinding[]>;
}
