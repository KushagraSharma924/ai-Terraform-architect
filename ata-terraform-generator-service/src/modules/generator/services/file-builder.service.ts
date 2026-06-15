import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface GeneratedFileInfo {
  filePath: string;
  fileType: 'root_config' | 'module_file' | 'readme' | 'tfvars';
  content: string;
  checksum: string;
  sizeBytes: number;
}

@Injectable()
export class FileBuilderService {
  private readonly logger = new Logger(FileBuilderService.name);

  constructor(private readonly config: ConfigService) {}

  getProjectPath(versionId: string): string {
    // Generate inside User's Workspace scratch directory to respect workspace boundaries
    return path.join('/Users/kushagra/Desktop/Ata/scratch/projects', versionId);
  }

  async build(
    versionId: string,
    rootFiles: {
      'main.tf': string;
      'variables.tf': string;
      'outputs.tf': string;
      'terraform.tfvars': string;
      'versions.tf': string;
    },
    modules: { name: string; sourcePath: string }[],
  ): Promise<GeneratedFileInfo[]> {
    const projectDir = this.getProjectPath(versionId);
    this.logger.log(`Building project structure at ${projectDir}`);

    // Create target dir
    fs.mkdirSync(projectDir, { recursive: true });

    const generatedFiles: GeneratedFileInfo[] = [];

    // 1. Write root files
    for (const [filename, content] of Object.entries(rootFiles)) {
      const filePath = path.join(projectDir, filename);
      fs.writeFileSync(filePath, content, 'utf8');

      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      const sizeBytes = Buffer.byteLength(content, 'utf8');

      generatedFiles.push({
        filePath: filename,
        fileType: filename === 'terraform.tfvars' ? 'tfvars' : 'root_config',
        content,
        checksum,
        sizeBytes,
      });
    }

    // 2. Copy modules verbatim from curated modules path
    const modulesSourceDir = this.config.get<string>('app.modulesPath')!;
    const modulesTargetDir = path.join(projectDir, 'modules');
    fs.mkdirSync(modulesTargetDir, { recursive: true });

    for (const mod of modules) {
      const srcModPath = path.join(modulesSourceDir, mod.sourcePath);
      const destModPath = path.join(modulesTargetDir, mod.sourcePath);

      if (!fs.existsSync(srcModPath)) {
        throw new Error(`Curated module source not found: ${srcModPath}`);
      }

      this.logger.log(`Copying module ${mod.name} from ${srcModPath} to ${destModPath}`);
      fs.mkdirSync(destModPath, { recursive: true });

      // Copy all .tf and metadata files
      const files = fs.readdirSync(srcModPath);
      for (const file of files) {
        const srcFilePath = path.join(srcModPath, file);
        const destFilePath = path.join(destModPath, file);
        const stat = fs.statSync(srcFilePath);

        if (stat.isFile() && (file.endsWith('.tf') || file === 'module.meta.json' || file === 'README.md')) {
          fs.copyFileSync(srcFilePath, destFilePath);
          const content = fs.readFileSync(destFilePath, 'utf8');
          const checksum = crypto.createHash('sha256').update(content).digest('hex');
          const sizeBytes = stat.size;

          generatedFiles.push({
            filePath: path.join('modules', mod.sourcePath, file),
            fileType: 'module_file',
            content,
            checksum,
            sizeBytes,
          });
        }
      }
    }

    return generatedFiles;
  }
}
