import { HeuristicScanner } from './scanners/heuristic-scanner';
import { RiskScoringEngine } from './engines/risk-scoring.engine';
import { ComplianceEngine } from './engines/compliance.engine';

const VULNERABLE_TF = `
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  acl    = "public-read"
}

resource "aws_security_group" "web" {
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_ebs_volume" "vol" {
  encrypted = false
}
`;

const CLEAN_TF = `
resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  acl    = "private"
}
resource "aws_ebs_volume" "vol" {
  encrypted = true
}
`;

describe('HeuristicScanner', () => {
  const scanner = new HeuristicScanner();

  it('detects the seeded misconfigurations', async () => {
    const findings = await scanner.scan([{ path: 'main.tf', content: VULNERABLE_TF }]);
    const rules = findings.map((f) => f.ruleId);
    expect(rules).toContain('ATA_S3_PUBLIC_ACL');
    expect(rules).toContain('ATA_SG_OPEN_INGRESS');
    expect(rules).toContain('ATA_EBS_UNENCRYPTED');
  });

  it('attributes findings to the enclosing resource and line', async () => {
    const findings = await scanner.scan([{ path: 'main.tf', content: VULNERABLE_TF }]);
    const s3 = findings.find((f) => f.ruleId === 'ATA_S3_PUBLIC_ACL');
    expect(s3?.resource).toBe('aws_s3_bucket.data');
    expect(s3?.line).toBeGreaterThan(0);
  });

  it('returns no findings for clean terraform', async () => {
    const findings = await scanner.scan([{ path: 'main.tf', content: CLEAN_TF }]);
    expect(findings).toHaveLength(0);
  });
});

describe('RiskScoringEngine', () => {
  const engine = new RiskScoringEngine();

  it('scores clean infra as A/100', () => {
    const r = engine.score([]);
    expect(r.score).toBe(100);
    expect(r.grade).toBe('A');
  });

  it('penalizes a critical finding and caps the grade', () => {
    const r = engine.score([
      { scanner: 'h', ruleId: 'X', severity: 'critical', message: 'm' },
    ]);
    expect(r.score).toBeLessThan(100);
    expect(['C', 'D', 'F']).toContain(r.grade);
  });
});

describe('ComplianceEngine', () => {
  const engine = new ComplianceEngine();

  it('fails the relevant SOC2 control on a public bucket', () => {
    const report = engine.evaluate('soc2', [
      { scanner: 'h', ruleId: 'ATA_S3_PUBLIC_ACL', severity: 'critical', message: 'm' },
    ]);
    const cc68 = report.controls.find((c) => c.controlId === 'CC6.8');
    expect(cc68?.status).toBe('fail');
    expect(report.readinessPct).toBeLessThan(100);
  });

  it('passes all controls for clean infra', () => {
    const report = engine.evaluate('cis', []);
    expect(report.readinessPct).toBe(100);
  });
});
