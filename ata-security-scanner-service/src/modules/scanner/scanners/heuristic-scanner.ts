import { Injectable } from '@nestjs/common';
import { RawFinding, ScanFile, ScannerPort, Severity } from './scanner.port';

interface Rule {
  ruleId: string;
  severity: Severity;
  message: string;
  remediation: string;
  /** Matches a single line; capture group 1 (if any) becomes the resource hint. */
  pattern: RegExp;
}

/**
 * Real, dependency-free static checks for the misconfigurations called out in
 * the Phase 8 design. These are intentionally conservative regex rules — the
 * production posture layers Checkov/tfsec/OPA on top via the same ScannerPort.
 */
const RULES: Rule[] = [
  {
    ruleId: 'ATA_S3_PUBLIC_ACL',
    severity: 'critical',
    message: 'S3 bucket grants public access via ACL',
    remediation: 'Set acl = "private" and enable an aws_s3_bucket_public_access_block.',
    pattern: /acl\s*=\s*"(public-read|public-read-write)"/i,
  },
  {
    ruleId: 'ATA_SG_OPEN_INGRESS',
    severity: 'high',
    message: 'Security group allows ingress from 0.0.0.0/0',
    remediation: 'Restrict cidr_blocks to known ranges; avoid 0.0.0.0/0 on ingress.',
    pattern: /cidr_blocks\s*=\s*\[\s*"0\.0\.0\.0\/0"/i,
  },
  {
    ruleId: 'ATA_IAM_WILDCARD_ACTION',
    severity: 'high',
    message: 'IAM policy grants wildcard action "*"',
    remediation: 'Scope Action to the specific operations required (least privilege).',
    pattern: /"?Action"?\s*[:=]\s*"\*"/i,
  },
  {
    ruleId: 'ATA_IAM_WILDCARD_RESOURCE',
    severity: 'medium',
    message: 'IAM policy applies to all resources ("*")',
    remediation: 'Scope Resource to specific ARNs instead of "*".',
    pattern: /"?Resource"?\s*[:=]\s*"\*"/i,
  },
  {
    ruleId: 'ATA_EBS_UNENCRYPTED',
    severity: 'high',
    message: 'EBS / volume encryption is explicitly disabled',
    remediation: 'Set encrypted = true on the volume / block device.',
    pattern: /encrypted\s*=\s*false/i,
  },
  {
    ruleId: 'ATA_RDS_PUBLIC',
    severity: 'high',
    message: 'RDS instance is publicly accessible',
    remediation: 'Set publicly_accessible = false and place the DB in private subnets.',
    pattern: /publicly_accessible\s*=\s*true/i,
  },
  {
    ruleId: 'ATA_HARDCODED_SECRET',
    severity: 'critical',
    message: 'Possible hard-coded secret in Terraform source',
    remediation: 'Move secrets to a secrets manager / variables, never commit them.',
    pattern: /(password|secret|access_key)\s*=\s*"(?!var\.|local\.|data\.)[^"]{8,}"/i,
  },
];

@Injectable()
export class HeuristicScanner implements ScannerPort {
  readonly name = 'heuristic';

  async scan(files: ScanFile[]): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];
    for (const file of files) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        for (const rule of RULES) {
          if (rule.pattern.test(line)) {
            findings.push({
              scanner: this.name,
              ruleId: rule.ruleId,
              severity: rule.severity,
              filePath: file.path,
              line: idx + 1,
              resource: this.nearestResource(lines, idx),
              message: rule.message,
              remediation: rule.remediation,
            });
          }
        }
      });
    }
    return findings;
  }

  /** Walk upward to find the enclosing `resource "type" "name"` block. */
  private nearestResource(lines: string[], from: number): string | undefined {
    for (let i = from; i >= 0; i--) {
      const m = lines[i].match(/resource\s+"([^"]+)"\s+"([^"]+)"/);
      if (m) return `${m[1]}.${m[2]}`;
    }
    return undefined;
  }
}
