#!/usr/bin/env node

/**
 * CLI tool for validating accessibility compliance of LGF cartridges
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { WCAGValidator } from '../core/wcag-validator.js';
import { LGFCartridge } from '../types/core.js';

interface CLIOptions {
  input: string;
  output?: string;
  level: 'A' | 'AA' | 'AAA';
  format: 'json' | 'html' | 'text';
  includeWarnings: boolean;
  verbose: boolean;
}

class AccessibilityValidatorCLI {
  private validator: WCAGValidator;

  constructor() {
    this.validator = new WCAGValidator();
  }

  async run(args: string[]): Promise<void> {
    try {
      const options = this.parseArgs(args);
      await this.validateFile(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      input: '',
      level: 'AA',
      format: 'text',
      includeWarnings: true,
      verbose: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '-i':
        case '--input':
          options.input = args[++i];
          break;
        case '-o':
        case '--output':
          options.output = args[++i];
          break;
        case '-l':
        case '--level':
          const level = args[++i] as 'A' | 'AA' | 'AAA';
          if (!['A', 'AA', 'AAA'].includes(level)) {
            throw new Error('Invalid WCAG level. Must be A, AA, or AAA');
          }
          options.level = level;
          break;
        case '-f':
        case '--format':
          const format = args[++i] as 'json' | 'html' | 'text';
          if (!['json', 'html', 'text'].includes(format)) {
            throw new Error('Invalid format. Must be json, html, or text');
          }
          options.format = format;
          break;
        case '--no-warnings':
          options.includeWarnings = false;
          break;
        case '-v':
        case '--verbose':
          options.verbose = true;
          break;
        case '-h':
        case '--help':
          this.showHelp();
          process.exit(0);
          break;
        default:
          if (!options.input && !arg.startsWith('-')) {
            options.input = arg;
          }
      }
    }

    if (!options.input) {
      throw new Error('Input file is required. Use -i or --input to specify the LGF file.');
    }

    return options;
  }

  private async validateFile(options: CLIOptions): Promise<void> {
    if (options.verbose) {
      console.log(`Validating accessibility for: ${options.input}`);
      console.log(`WCAG Level: ${options.level}`);
      console.log(`Output Format: ${options.format}`);
    }

    // Read and parse the LGF file
    const filePath = resolve(options.input);
    const fileContent = await readFile(filePath, 'utf-8');
    
    let cartridge: LGFCartridge;
    try {
      cartridge = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Invalid JSON in file: ${options.input}`);
    }

    // Validate the cartridge structure
    if (!cartridge.theme || !cartridge.scenes) {
      throw new Error('Invalid LGF cartridge format');
    }

    // Extract all nodes from all scenes
    const allNodes = cartridge.scenes.flatMap(scene => this.extractNodes(scene.root));

    if (options.verbose) {
      console.log(`Found ${cartridge.scenes.length} scenes with ${allNodes.length} total nodes`);
    }

    // Run accessibility validation
    const report = this.validator.validate(cartridge.theme, allNodes, {
      targetLevel: options.level,
      includeWarnings: options.includeWarnings
    });

    // Generate report
    const reportContent = this.validator.generateReport(report, options.format);

    // Output results
    if (options.output) {
      await writeFile(options.output, reportContent, 'utf-8');
      console.log(`Accessibility report saved to: ${options.output}`);
    } else {
      console.log(reportContent);
    }

    // Print summary to stderr so it doesn't interfere with piped output
    if (options.verbose || !options.output) {
      console.error('\n' + '='.repeat(50));
      console.error('ACCESSIBILITY VALIDATION SUMMARY');
      console.error('='.repeat(50));
      console.error(`Status: ${report.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
      console.error(`Score: ${report.score}/100`);
      console.error(`Level: WCAG ${report.level}`);
      console.error(`Total Checks: ${report.summary.totalChecks}`);
      console.error(`Passed: ${report.summary.passed}`);
      console.error(`Failed: ${report.summary.failed}`);
      console.error(`Warnings: ${report.summary.warnings}`);
      
      if (report.violations.length > 0) {
        console.error(`\nTop Issues:`);
        report.violations.slice(0, 3).forEach((violation, i) => {
          console.error(`${i + 1}. ${violation.criterion}: ${violation.description}`);
        });
      }
    }

    // Exit with error code if not compliant
    if (!report.compliant) {
      process.exit(1);
    }
  }

  private extractNodes(node: any): any[] {
    const nodes = [node];
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        nodes.push(...this.extractNodes(child));
      }
    }
    return nodes;
  }

  private showHelp(): void {
    console.log(`
LLM Canvas Engine Accessibility Validator

USAGE:
  accessibility-validator [OPTIONS] <input-file>

OPTIONS:
  -i, --input <file>     Input LGF cartridge file (required)
  -o, --output <file>    Output file for the report (optional, prints to stdout if not specified)
  -l, --level <level>    WCAG compliance level: A, AA, or AAA (default: AA)
  -f, --format <format>  Report format: json, html, or text (default: text)
  --no-warnings          Exclude warnings from the report
  -v, --verbose          Enable verbose output
  -h, --help             Show this help message

EXAMPLES:
  # Basic validation
  accessibility-validator game.lgf.json

  # Validate for AAA compliance with HTML report
  accessibility-validator -l AAA -f html -o report.html game.lgf.json

  # JSON output for CI integration
  accessibility-validator -f json --no-warnings game.lgf.json > report.json

  # Verbose validation with all warnings
  accessibility-validator -v game.lgf.json

EXIT CODES:
  0  - Validation passed (compliant)
  1  - Validation failed (non-compliant or error)

WCAG LEVELS:
  A   - Basic accessibility (minimum level)
  AA  - Standard accessibility (recommended for most applications)
  AAA - Enhanced accessibility (highest level)

REPORT FORMATS:
  text - Human-readable text format (default)
  json - Machine-readable JSON format
  html - Formatted HTML report with styling
`);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AccessibilityValidatorCLI();
  cli.run(process.argv.slice(2));
}

export { AccessibilityValidatorCLI };