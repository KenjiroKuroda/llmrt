/**
 * LGF Cartridge Validator CLI Tool
 * Command-line interface for validating LGF cartridge files
 */
import { ValidationResult } from '../core/validator.js';
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
declare class LGFValidatorCLI {
    private options;
    private stats;
    constructor(options: CLIOptions);
    run(): Promise<number>;
    private collectFiles;
    private collectFromDirectory;
    private isLGFFile;
    private matchesPattern;
    private validateFiles;
    private validateFile;
    private buildLineNumberMap;
    private outputResults;
    private outputFileResult;
    private outputErrors;
    private outputWarnings;
    private outputSummary;
    private outputStatistics;
    private outputJSON;
    private colorize;
    private log;
    private warn;
    private error;
}
export { LGFValidatorCLI, CLIOptions, ValidationStats, FileResult };
//# sourceMappingURL=validator.d.ts.map