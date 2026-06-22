import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScanController } from './controllers/scan.controller';
import { ScanRepository } from './repositories/scan.repository';
import { ScanOrchestratorService } from './services/scan-orchestrator.service';
import { RiskScoringEngine } from './engines/risk-scoring.engine';
import { ComplianceEngine } from './engines/compliance.engine';
import { HeuristicScanner } from './scanners/heuristic-scanner';
import { SCANNER_PORT } from './scanners/scanner.port';
import { TERRAFORM_SOURCE, HttpTerraformSource } from './ports/terraform-source.port';
import { ScanProcessor } from './processors/scan.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'security-scan' })],
  controllers: [ScanController],
  providers: [
    ScanRepository,
    ScanOrchestratorService,
    RiskScoringEngine,
    ComplianceEngine,
    HeuristicScanner,
    ScanProcessor,
    // Register the active scanner set. Add Checkov/tfsec/OPA adapters here.
    {
      provide: SCANNER_PORT,
      useFactory: (heuristic: HeuristicScanner) => [heuristic],
      inject: [HeuristicScanner],
    },
    { provide: TERRAFORM_SOURCE, useClass: HttpTerraformSource },
  ],
})
export class ScannerModule {}
