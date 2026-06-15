import { Injectable } from '@nestjs/common';

@Injectable()
export class AmbiguityScorerService {
  scoreAndEnforceDefaults(spec: any): any {
    if (!spec || typeof spec !== 'object') return spec;

    const scored = { ...spec };

    // Enforce security-relevant defaults verbatim as defined in security considerations
    if (!scored.security) {
      scored.security = { encryptionAtRest: true, securityGroups: [] };
    } else {
      if (scored.security.encryptionAtRest === undefined) {
        scored.security.encryptionAtRest = true;
      }
    }

    if (!scored.networking) {
      scored.networking = { privateSubnets: true, publicSubnets: true, natGateway: true, vpcCidr: '10.0.0.0/16' };
    } else {
      if (scored.networking.privateSubnets === undefined) {
        scored.networking.privateSubnets = true;
      }
      if (!scored.networking.vpcCidr) {
        scored.networking.vpcCidr = '10.0.0.0/16';
      }
    }

    // Initialize ambiguities if absent
    if (!scored.ambiguities) {
      scored.ambiguities = [];
    }

    // Compute confidence score if omitted or null
    if (scored.confidenceScore === undefined || scored.confidenceScore === null) {
      const ambiguitiesCount = scored.ambiguities.length;
      const totalEvaluatedFields = 10; // default total fields evaluated
      scored.confidenceScore = Math.max(0.1, 1 - ambiguitiesCount / totalEvaluatedFields);
    }

    return scored;
  }
}
