import { Injectable } from '@nestjs/common';
import { RawFinding } from '../scanners/scanner.port';

export type Framework = 'cis' | 'soc2' | 'iso27001';

export interface ComplianceControlResult {
  framework: Framework;
  controlId: string;
  title: string;
  status: 'pass' | 'fail';
  findingRefs: string[];
}

export interface ComplianceReport {
  framework: Framework;
  readinessPct: number;
  controls: ComplianceControlResult[];
}

interface ControlDef {
  controlId: string;
  title: string;
  /** Rule ids whose presence fails this control. */
  failsOn: string[];
}

/**
 * Maps detected findings to compliance controls. Mapping tables are the
 * versioned source of truth (Phase 8 §9); seeded here for the rules the
 * heuristic scanner emits. Real deployments extend these with the full
 * CIS/SOC2/ISO control sets.
 */
const FRAMEWORKS: Record<Framework, ControlDef[]> = {
  cis: [
    { controlId: 'CIS-2.1.1', title: 'Ensure S3 buckets are not public', failsOn: ['ATA_S3_PUBLIC_ACL'] },
    { controlId: 'CIS-5.2', title: 'Restrict ingress from 0.0.0.0/0', failsOn: ['ATA_SG_OPEN_INGRESS'] },
    { controlId: 'CIS-1.16', title: 'IAM policies grant least privilege', failsOn: ['ATA_IAM_WILDCARD_ACTION', 'ATA_IAM_WILDCARD_RESOURCE'] },
    { controlId: 'CIS-2.2.1', title: 'Ensure EBS volumes are encrypted', failsOn: ['ATA_EBS_UNENCRYPTED'] },
  ],
  soc2: [
    { controlId: 'CC6.1', title: 'Logical access controls (least privilege)', failsOn: ['ATA_IAM_WILDCARD_ACTION', 'ATA_IAM_WILDCARD_RESOURCE'] },
    { controlId: 'CC6.6', title: 'Restrict network exposure', failsOn: ['ATA_SG_OPEN_INGRESS', 'ATA_RDS_PUBLIC'] },
    { controlId: 'CC6.7', title: 'Encrypt data at rest and in transit', failsOn: ['ATA_EBS_UNENCRYPTED'] },
    { controlId: 'CC6.8', title: 'Protect against unauthorized data exposure', failsOn: ['ATA_S3_PUBLIC_ACL', 'ATA_HARDCODED_SECRET'] },
  ],
  iso27001: [
    { controlId: 'A.9.4', title: 'System and application access control', failsOn: ['ATA_IAM_WILDCARD_ACTION', 'ATA_IAM_WILDCARD_RESOURCE'] },
    { controlId: 'A.10.1', title: 'Cryptographic controls', failsOn: ['ATA_EBS_UNENCRYPTED', 'ATA_HARDCODED_SECRET'] },
    { controlId: 'A.13.1', title: 'Network security management', failsOn: ['ATA_SG_OPEN_INGRESS', 'ATA_RDS_PUBLIC'] },
    { controlId: 'A.8.2', title: 'Information classification / exposure', failsOn: ['ATA_S3_PUBLIC_ACL'] },
  ],
};

@Injectable()
export class ComplianceEngine {
  evaluate(framework: Framework, findings: RawFinding[]): ComplianceReport {
    const present = new Set(findings.map((f) => f.ruleId));
    const controls: ComplianceControlResult[] = FRAMEWORKS[framework].map((def) => {
      const refs = def.failsOn.filter((r) => present.has(r));
      return {
        framework,
        controlId: def.controlId,
        title: def.title,
        status: refs.length === 0 ? 'pass' : 'fail',
        findingRefs: refs,
      };
    });
    const passed = controls.filter((c) => c.status === 'pass').length;
    const readinessPct = controls.length ? Math.round((passed / controls.length) * 100) : 100;
    return { framework, readinessPct, controls };
  }

  evaluateAll(findings: RawFinding[]): ComplianceReport[] {
    return (Object.keys(FRAMEWORKS) as Framework[]).map((f) => this.evaluate(f, findings));
  }
}
