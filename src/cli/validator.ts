/**
 * LGF Cartridge Validator CLI Tool
 * Command-line interface for validating LGF cartridge files
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, relative, resolve } from 'path';
import { validateCartridge, ValidationResult, ValidationError, ValidationWarning } from '../core/validator.js';

interface CLIOptions {
  files: string[];
  recursive: boolean;
  verbose: boolean;
  json: boolean;
  quiet: boolean;
  exitCode: boolean;
  pattern?: string;
  exclude?: string[];
}

interface ValidationStats {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
  processingTime: number;
}

interface FileResult {
  file: string;
  result: ValidationResult;
  parseError?: string;
  lineNumbers?: Map<string, number>;
}

class LGFValidatorCLI {
  private options: CLIOptions;
  private stats: ValidationStats;

  constructor(options: CLIOptions) {
    this.options = options;
    this.stats = {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      totalErrors: 0,
      totalWarnings: 0,
      processingTime: 0
    };
  }

  async run(): Promise<number> {
    const startTime = Date.now();

    try {
      const files = await this.collectFiles();
      
      if (files.length === 0) {
        this.error('No LGF files found to validate');
        return 1;
      }

      const results = await this.validateFiles(files);
      
      this.stats.processingTime = Date.now() - startTime;
      
      if (this.options.json) {
        this.outputJSON(results);
      } else {
        this.outputResults(results);
      }

      return this.stats.invalidFiles > 0 && this.options.exitCode ? 1 : 0;
    } catch (error) {
      this.error(`CLI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 1;
    }
  }

  private async collectFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const input of this.options.files) {
      try {
        const inputPath = resolve(input);
        const stats = await stat(inputPath);

        if (stats.isFile()) {
          if (this.isLGFFile(inputPath)) {
            allFiles.push(inputPath);
          }
        } else if (stats.isDirectory()) {
          const dirFiles = await this.collectFromDirectory(inputPath);
          allFiles.push(...dirFiles);
        }
      } catch (error) {
        this.warn(`Cannot access ${input}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  private async collectFromDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        
        // Skip excluded patterns
        if (this.options.exclude?.some(pattern => this.matchesPattern(entry, pattern))) {
          continue;
        }

        try {
          const stats = await stat(fullPath);

          if (stats.isFile() && this.isLGFFile(fullPath)) {
            // Check if file matches pattern
            if (!this.options.pattern || this.matchesPattern(entry, this.options.pattern)) {
              files.push(fullPath);
            }
          } else if (stats.isDirectory() && this.options.recursive) {
            const subFiles = await this.collectFromDirectory(fullPath);
            files.push(...subFiles);
          }
        } catch (error) {
          this.warn(`Cannot access ${fullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      this.warn(`Cannot read directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return files;
  }

  private isLGFFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return ext === '.json' && (
      filePath.includes('.lgf.') || 
      filePath.endsWith('.lgf') ||
      filePath.includes('cartridge')
    );
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = new RegExp(
      pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
    );
    return regex.test(filename);
  }

  private async validateFiles(files: string[]): Promise<FileResult[]> {
    const results: FileResult[] = [];

    for (const file of files) {
      if (this.options.verbose && !this.options.quiet) {
        this.log(`Validating ${relative(process.cwd(), file)}...`);
      }

      const result = await this.validateFile(file);
      results.push(result);

      this.stats.totalFiles++;
      if (result.result.valid) {
        this.stats.validFiles++;
      } else {
        this.stats.invalidFiles++;
      }
      this.stats.totalErrors += result.result.errors.length;
      this.stats.totalWarnings += result.result.warnings.length;
    }

    return results;
  }

  private async validateFile(filePath: string): Promise<FileResult> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lineNumbers = this.buildLineNumberMap(content);
      
      let cartridge: any;
      try {
        cartridge = JSON.parse(content);
      } catch (parseError) {
        return {
          file: filePath,
          result: {
            valid: false,
            errors: [{
              path: '',
              message: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
              code: 'JSON_PARSE_ERROR'
            }],
            warnings: []
          },
          parseError: parseError instanceof Error ? parseError.message : 'Invalid JSON',
          lineNumbers
        };
      }

      const result = validateCartridge(cartridge);
      
      return {
        file: filePath,
        result,
        lineNumbers
      };
    } catch (error) {
      return {
        file: filePath,
        result: {
          valid: false,
          errors: [{
            path: '',
            message: `File read error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'FILE_READ_ERROR'
          }],
          warnings: []
        }
      };
    }
  }

  private buildLineNumberMap(content: string): Map<string, number> {
    const lines = content.split('\n');
    const lineMap = new Map<string, number>();
    
    // Build a map of JSON paths to line numbers
    // This is a simplified implementation - a full implementation would need
    // a proper JSON parser that tracks positions
    let currentLine = 1;
    let currentPath: string[] = [];
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '\n') {
        currentLine++;
        continue;
      }

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      // Look for property names
      if (char === '"') {
        const propertyMatch = content.slice(i).match(/^"([^"]+)"\s*:/);
        if (propertyMatch) {
          const propertyName = propertyMatch[1];
          const path = currentPath.length > 0 ? currentPath.join('.') + '.' + propertyName : propertyName;
          lineMap.set(path, currentLine);
        }
      }

      // Track object/array nesting (simplified)
      if (char === '{' || char === '[') {
        // This is a simplified approach - would need more sophisticated parsing
        // for accurate path tracking in complex nested structures
      }
    }

    return lineMap;
  }

  private outputResults(results: FileResult[]): void {
    if (!this.options.quiet) {
      this.outputSummary();
      console.log('');
    }

    for (const result of results) {
      if (!result.result.valid || result.result.warnings.length > 0 || this.options.verbose) {
        this.outputFileResult(result);
      }
    }

    if (!this.options.quiet) {
      this.outputStatistics();
    }
  }

  private outputFileResult(result: FileResult): void {
    const relativePath = relative(process.cwd(), result.file);
    
    if (result.result.valid) {
      if (result.result.warnings.length > 0) {
        console.log(`\n${this.colorize('yellow', '⚠')} ${relativePath}`);
        this.outputWarnings(result.result.warnings, result.lineNumbers);
      } else if (this.options.verbose) {
        console.log(`\n${this.colorize('green', '✓')} ${relativePath}`);
      }
    } else {
      console.log(`\n${this.colorize('red', '✗')} ${relativePath}`);
      
      if (result.parseError) {
        console.log(`  ${this.colorize('red', 'Parse Error:')} ${result.parseError}`);
      } else {
        this.outputErrors(result.result.errors, result.lineNumbers);
      }
      
      if (result.result.warnings.length > 0) {
        this.outputWarnings(result.result.warnings, result.lineNumbers);
      }
    }
  }

  private outputErrors(errors: ValidationError[], lineNumbers?: Map<string, number>): void {
    for (const error of errors) {
      const lineInfo = lineNumbers?.get(error.path) ? `:${lineNumbers.get(error.path)}` : '';
      console.log(`  ${this.colorize('red', 'Error')} ${error.path}${lineInfo}: ${error.message}`);
      
      if (error.suggestion && this.options.verbose) {
        console.log(`    ${this.colorize('cyan', 'Suggestion:')} ${error.suggestion}`);
      }
    }
  }

  private outputWarnings(warnings: ValidationWarning[], lineNumbers?: Map<string, number>): void {
    for (const warning of warnings) {
      const lineInfo = lineNumbers?.get(warning.path) ? `:${lineNumbers.get(warning.path)}` : '';
      console.log(`  ${this.colorize('yellow', 'Warning')} ${warning.path}${lineInfo}: ${warning.message}`);
      
      if (warning.suggestion && this.options.verbose) {
        console.log(`    ${this.colorize('cyan', 'Suggestion:')} ${warning.suggestion}`);
      }
    }
  }

  private outputSummary(): void {
    const validCount = this.colorize('green', this.stats.validFiles.toString());
    const invalidCount = this.colorize('red', this.stats.invalidFiles.toString());
    const totalCount = this.stats.totalFiles.toString();
    
    console.log(`LGF Validator - ${validCount} valid, ${invalidCount} invalid, ${totalCount} total`);
  }

  private outputStatistics(): void {
    console.log('\n' + this.colorize('cyan', 'Statistics:'));
    console.log(`  Files processed: ${this.stats.totalFiles}`);
    console.log(`  Valid files: ${this.colorize('green', this.stats.validFiles.toString())}`);
    console.log(`  Invalid files: ${this.colorize('red', this.stats.invalidFiles.toString())}`);
    console.log(`  Total errors: ${this.colorize('red', this.stats.totalErrors.toString())}`);
    console.log(`  Total warnings: ${this.colorize('yellow', this.stats.totalWarnings.toString())}`);
    console.log(`  Processing time: ${this.stats.processingTime}ms`);
    
    if (this.stats.totalFiles > 0) {
      const successRate = ((this.stats.validFiles / this.stats.totalFiles) * 100).toFixed(1);
      console.log(`  Success rate: ${successRate}%`);
    }
  }

  private outputJSON(results: FileResult[]): void {
    const output = {
      summary: {
        totalFiles: this.stats.totalFiles,
        validFiles: this.stats.validFiles,
        invalidFiles: this.stats.invalidFiles,
        totalErrors: this.stats.totalErrors,
        totalWarnings: this.stats.totalWarnings,
        processingTime: this.stats.processingTime,
        successRate: this.stats.totalFiles > 0 ? (this.stats.validFiles / this.stats.totalFiles) * 100 : 0
      },
      files: results.map(result => ({
        file: relative(process.cwd(), result.file),
        valid: result.result.valid,
        errors: result.result.errors,
        warnings: result.result.warnings,
        parseError: result.parseError
      }))
    };

    console.log(JSON.stringify(output, null, 2));
  }

  private colorize(color: string, text: string): string {
    if (process.env.NO_COLOR || !process.stdout.isTTY) {
      return text;
    }

    const colors: Record<string, string> = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m'
    };

    return `${colors[color] || ''}${text}${colors.reset}`;
  }

  private log(message: string): void {
    if (!this.options.quiet) {
      console.log(message);
    }
  }

  private warn(message: string): void {
    if (!this.options.quiet) {
      console.warn(`${this.colorize('yellow', 'Warning:')} ${message}`);
    }
  }

  private error(message: string): void {
    console.error(`${this.colorize('red', 'Error:')} ${message}`);
  }
}

// CLI argument parsing
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    files: [],
    recursive: false,
    verbose: false,
    json: false,
    quiet: false,
    exitCode: true,
    exclude: []
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-r':
      case '--recursive':
        options.recursive = true;
        break;
      
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      
      case '-j':
      case '--json':
        options.json = true;
        break;
      
      case '-q':
      case '--quiet':
        options.quiet = true;
        break;
      
      case '--no-exit-code':
        options.exitCode = false;
        break;
      
      case '-p':
      case '--pattern':
        if (i + 1 < args.length) {
          options.pattern = args[++i];
        } else {
          throw new Error('--pattern requires a value');
        }
        break;
      
      case '-e':
      case '--exclude':
        if (i + 1 < args.length) {
          options.exclude = options.exclude || [];
          options.exclude.push(args[++i]);
        } else {
          throw new Error('--exclude requires a value');
        }
        break;
      
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);
        break;
      
      case '--version':
        console.log('1.0.0');
        process.exit(0);
        break;
      
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        options.files.push(arg);
        break;
    }
  }

  if (options.files.length === 0) {
    options.files.push('.'); // Default to current directory
  }

  return options;
}

function showHelp(): void {
  console.log(`
LGF Cartridge Validator

Usage: lgf-validate [options] [files...]

Options:
  -r, --recursive       Recursively search directories for LGF files
  -v, --verbose         Show detailed output including successful validations
  -j, --json           Output results in JSON format
  -q, --quiet          Suppress non-error output
  -p, --pattern <glob>  Only validate files matching the pattern
  -e, --exclude <glob>  Exclude files matching the pattern (can be used multiple times)
  --no-exit-code       Don't exit with error code on validation failures
  -h, --help           Show this help message
  --version            Show version number

Examples:
  lgf-validate game.lgf.json                    # Validate single file
  lgf-validate games/                           # Validate all LGF files in directory
  lgf-validate -r src/                          # Recursively validate all LGF files
  lgf-validate -p "*.lgf.json" -r .            # Validate files matching pattern
  lgf-validate -e "test*" -r .                 # Exclude test files
  lgf-validate -j games/ > validation.json     # Output JSON report
  lgf-validate -v -r .                         # Verbose output with all results

Exit Codes:
  0  All files are valid
  1  One or more files are invalid or CLI error occurred
`);
}

// Main execution
async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const cli = new LGFValidatorCLI(options);
    const exitCode = await cli.run();
    process.exit(exitCode);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { LGFValidatorCLI, CLIOptions, ValidationStats, FileResult };