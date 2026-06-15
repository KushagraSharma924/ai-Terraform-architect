import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { FileBuilderService } from './file-builder.service';

const execAsync = promisify(exec);

export interface ValidationReport {
  fmtPassed: boolean;
  validatePassed: boolean;
  fmtOutput: string;
  validateOutput: any;
}

@Injectable()
export class TerraformValidatorService {
  private readonly logger = new Logger(TerraformValidatorService.name);

  constructor(private readonly fileBuilder: FileBuilderService) {}

  async validateProject(versionId: string): Promise<ValidationReport> {
    const projectDir = this.fileBuilder.getProjectPath(versionId);
    this.logger.log(`Validating Terraform project at ${projectDir}`);

    let fmtPassed = true;
    let fmtOutput = '';
    let validatePassed = false;
    let validateOutput: any = null;

    // 1. Run terraform fmt (formats files in place)
    try {
      const { stdout, stderr } = await execAsync('terraform fmt', { cwd: projectDir });
      fmtOutput = stdout || stderr || '';
      this.logger.log(`Terraform fmt executed successfully`);
    } catch (err: any) {
      this.logger.warn(`Terraform fmt warning or failure: ${err.message}`);
      fmtPassed = false;
      fmtOutput = err.stdout || err.stderr || err.message;
    }

    // 2. Run terraform init -backend=false
    try {
      this.logger.log(`Initializing terraform project (backend=false)`);
      await execAsync('terraform init -backend=false', { cwd: projectDir });
      this.logger.log(`Terraform init completed successfully`);

      // 3. Run terraform validate -json
      const { stdout } = await execAsync('terraform validate -json', { cwd: projectDir });
      try {
        validateOutput = JSON.parse(stdout);
        validatePassed = validateOutput.valid === true;
      } catch (parseErr: any) {
        this.logger.error(`Failed to parse terraform validate JSON output: ${parseErr.message}`);
        validateOutput = { error: 'Failed to parse validate output', raw: stdout };
      }
    } catch (err: any) {
      this.logger.error(`Terraform init/validate failed: ${err.message}`);
      if (err.stdout) {
        try {
          validateOutput = JSON.parse(err.stdout);
          validatePassed = validateOutput.valid === true;
        } catch (e) {
          validateOutput = { error: err.message, stderr: err.stderr, stdout: err.stdout };
        }
      } else {
        validateOutput = { error: err.message, stderr: err.stderr };
      }
    }

    return {
      fmtPassed,
      validatePassed,
      fmtOutput,
      validateOutput,
    };
  }
}
