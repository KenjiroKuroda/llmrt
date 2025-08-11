/**
 * Unit tests for LGF Validator CLI Tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { LGFValidatorCLI, CLIOptions } from './validator.js';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('LGFValidatorCLI', () => {
  const testDir = join(process.cwd(), 'test-temp');
  
  beforeEach(async () => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
    
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Restore console methods
    vi.restoreAllMocks();
    
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Collection', () => {
    it('should collect single LGF file', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'test.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: true, // Use JSON output to ensure console.log is called
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should collect multiple LGF files from directory', async () => {
      const validCartridge = createValidCartridge();
      
      await writeFile(join(testDir, 'game1.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'game2.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'not-lgf.json'), '{"test": true}'); // Should be ignored

      const options: CLIOptions = {
        files: [testDir],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      
      // Check JSON output contains both files
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalFiles"')
      );
      expect(jsonOutput).toBeDefined();
      
      const output = JSON.parse(jsonOutput![0]);
      expect(output.summary.totalFiles).toBe(2);
      expect(output.summary.validFiles).toBe(2);
    });

    it('should recursively collect files when recursive option is enabled', async () => {
      const validCartridge = createValidCartridge();
      
      // Create nested directory structure
      const subDir = join(testDir, 'subdir');
      await mkdir(subDir, { recursive: true });
      
      await writeFile(join(testDir, 'root.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(subDir, 'nested.lgf.json'), JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [testDir],
        recursive: true,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalFiles"')
      );
      const output = JSON.parse(jsonOutput![0]);
      expect(output.summary.totalFiles).toBe(2);
    });

    it('should filter files by pattern', async () => {
      const validCartridge = createValidCartridge();
      
      await writeFile(join(testDir, 'pong.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'tetris.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'config.lgf.json'), JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [testDir],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false,
        pattern: 'p*.lgf.json'
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalFiles"')
      );
      const output = JSON.parse(jsonOutput![0]);
      expect(output.summary.totalFiles).toBe(1); // Only pong.lgf.json should match
    });

    it('should exclude files by pattern', async () => {
      const validCartridge = createValidCartridge();
      
      await writeFile(join(testDir, 'game.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'test.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'test-backup.lgf.json'), JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [testDir],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false,
        exclude: ['test*']
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalFiles"')
      );
      const output = JSON.parse(jsonOutput![0]);
      expect(output.summary.totalFiles).toBe(1); // Only game.lgf.json should remain
    });
  });

  describe('Validation Results', () => {
    it('should report valid cartridge correctly', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'valid.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: true,
        json: false,
        quiet: false,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
      
      // Should show success indicator in verbose mode
      const successOutput = mockConsole.log.mock.calls.find(call => 
        call[0].includes('✓') && call[0].includes('valid.lgf.json')
      );
      expect(successOutput).toBeDefined();
    });

    it('should report invalid cartridge with detailed errors', async () => {
      const invalidCartridge = {
        version: '2.0', // Invalid version
        metadata: {
          title: '', // Empty title
          author: 'Test Author'
          // Missing description
        },
        theme: {
          colors: {
            primary: 'invalid-color' // Invalid color format
            // Missing other required colors
          }
        },
        scenes: [], // Empty scenes array
        assets: {
          sprites: 'not-an-array' // Invalid type
        }
      };

      const filePath = join(testDir, 'invalid.lgf.json');
      await writeFile(filePath, JSON.stringify(invalidCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: true,
        json: false,
        quiet: false,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(1);
      
      // Should show error indicator
      const errorOutput = mockConsole.log.mock.calls.find(call => 
        call[0].includes('✗') && call[0].includes('invalid.lgf.json')
      );
      expect(errorOutput).toBeDefined();
      
      // Should show specific error messages
      const errorMessages = mockConsole.log.mock.calls.map(call => call[0]).join(' ');
      expect(errorMessages).toContain('Invalid version');
      expect(errorMessages).toContain('non-empty string'); // The actual error message for empty title
      expect(errorMessages).toContain('invalid-color');
    });

    it('should handle JSON parse errors', async () => {
      const invalidJSON = '{ "version": "1.0", invalid json }';
      const filePath = join(testDir, 'parse-error.lgf.json');
      await writeFile(filePath, invalidJSON);

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(1);
      
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"parseError"')
      );
      expect(jsonOutput).toBeDefined();
      
      const output = JSON.parse(jsonOutput![0]);
      expect(output.files[0].parseError).toBeDefined();
      expect(output.files[0].valid).toBe(false);
    });

    it('should report warnings for valid but problematic cartridges', async () => {
      const cartridgeWithWarnings = createValidCartridge();
      // Create empty scene to trigger warning
      cartridgeWithWarnings.scenes[0].root.children = [];

      const filePath = join(testDir, 'warnings.lgf.json');
      await writeFile(filePath, JSON.stringify(cartridgeWithWarnings, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: true,
        json: false,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0); // Still valid, just warnings
      
      // Should show warning indicator
      const warningOutput = mockConsole.log.mock.calls.find(call => 
        call[0].includes('⚠') && call[0].includes('warnings.lgf.json')
      );
      expect(warningOutput).toBeDefined();
    });
  });

  describe('Output Formats', () => {
    it('should output JSON format when requested', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'test.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      await cli.run();

      // Should output valid JSON
      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].startsWith('{')
      );
      expect(jsonOutput).toBeDefined();
      
      const output = JSON.parse(jsonOutput![0]);
      expect(output).toHaveProperty('summary');
      expect(output).toHaveProperty('files');
      expect(output.summary).toHaveProperty('totalFiles');
      expect(output.summary).toHaveProperty('validFiles');
      expect(output.summary).toHaveProperty('processingTime');
    });

    it('should suppress output in quiet mode', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'test.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: false,
        quiet: true,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      await cli.run();

      // Should have minimal output in quiet mode
      const logCalls = mockConsole.log.mock.calls.length;
      expect(logCalls).toBeLessThan(3); // Should be very minimal
    });

    it('should show detailed output in verbose mode', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'test.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: true,
        json: false,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      await cli.run();

      // Should show validation progress
      const progressOutput = mockConsole.log.mock.calls.find(call => 
        call[0].includes('Validating')
      );
      expect(progressOutput).toBeDefined();
      
      // Should show statistics
      const statsOutput = mockConsole.log.mock.calls.find(call => 
        call[0].includes('Statistics:')
      );
      expect(statsOutput).toBeDefined();
    });
  });

  describe('Statistics and Reporting', () => {
    it('should calculate and report accurate statistics', async () => {
      const validCartridge = createValidCartridge();
      const invalidCartridge = { version: 'invalid' };
      
      await writeFile(join(testDir, 'valid1.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'valid2.lgf.json'), JSON.stringify(validCartridge, null, 2));
      await writeFile(join(testDir, 'invalid1.lgf.json'), JSON.stringify(invalidCartridge, null, 2));

      const options: CLIOptions = {
        files: [testDir],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      await cli.run();

      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalFiles"')
      );
      const output = JSON.parse(jsonOutput![0]);
      
      expect(output.summary.totalFiles).toBe(3);
      expect(output.summary.validFiles).toBe(2);
      expect(output.summary.invalidFiles).toBe(1);
      expect(output.summary.successRate).toBeCloseTo(66.7, 1);
      expect(output.summary.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should track error and warning counts', async () => {
      const cartridgeWithMultipleErrors = {
        version: 'invalid',
        metadata: {},
        theme: {},
        scenes: [],
        assets: {}
      };
      
      const filePath = join(testDir, 'errors.lgf.json');
      await writeFile(filePath, JSON.stringify(cartridgeWithMultipleErrors, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: true,
        quiet: false,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      await cli.run();

      const jsonOutput = mockConsole.log.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('"totalErrors"')
      );
      const output = JSON.parse(jsonOutput![0]);
      
      expect(output.summary.totalErrors).toBeGreaterThan(5); // Should have many validation errors
      expect(output.files[0].errors.length).toBeGreaterThan(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent files gracefully', async () => {
      const options: CLIOptions = {
        files: [join(testDir, 'non-existent.lgf.json')],
        recursive: false,
        verbose: false,
        json: false,
        quiet: false,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(1);
      expect(mockConsole.warn).toHaveBeenCalled();
    });

    it('should handle permission errors gracefully', async () => {
      // This test would need platform-specific setup for permission testing
      // Skipping for now as it's complex to set up cross-platform
    });

    it('should handle empty directory', async () => {
      const emptyDir = join(testDir, 'empty');
      await mkdir(emptyDir, { recursive: true });

      const options: CLIOptions = {
        files: [emptyDir],
        recursive: false,
        verbose: false,
        json: false,
        quiet: false,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(1);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('No LGF files found')
      );
    });
  });

  describe('Exit Codes', () => {
    it('should return 0 for all valid files', async () => {
      const validCartridge = createValidCartridge();
      const filePath = join(testDir, 'valid.lgf.json');
      await writeFile(filePath, JSON.stringify(validCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: false,
        quiet: true,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
    });

    it('should return 1 for invalid files when exitCode is enabled', async () => {
      const invalidCartridge = { version: 'invalid' };
      const filePath = join(testDir, 'invalid.lgf.json');
      await writeFile(filePath, JSON.stringify(invalidCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: false,
        quiet: true,
        exitCode: true
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(1);
    });

    it('should return 0 for invalid files when exitCode is disabled', async () => {
      const invalidCartridge = { version: 'invalid' };
      const filePath = join(testDir, 'invalid.lgf.json');
      await writeFile(filePath, JSON.stringify(invalidCartridge, null, 2));

      const options: CLIOptions = {
        files: [filePath],
        recursive: false,
        verbose: false,
        json: false,
        quiet: true,
        exitCode: false
      };

      const cli = new LGFValidatorCLI(options);
      const exitCode = await cli.run();

      expect(exitCode).toBe(0);
    });
  });
});

// Helper function to create valid test cartridge
function createValidCartridge() {
  return {
    version: '1.0',
    metadata: {
      title: 'Test Game',
      author: 'Test Author',
      description: 'A test game cartridge'
    },
    theme: {
      colors: {
        primary: '#FF0000',
        secondary: '#00FF00',
        background: '#0000FF',
        text: '#FFFFFF',
        accent: '#FFFF00'
      },
      font: {
        family: 'Arial',
        sizes: {
          small: 12,
          medium: 16,
          large: 24
        }
      },
      spacing: {
        small: 4,
        medium: 8,
        large: 16
      },
      radii: {
        small: 2,
        medium: 4,
        large: 8
      }
    },
    scenes: [{
      id: 'testScene',
      root: {
        id: 'root',
        type: 'Group',
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        },
        visible: true,
        children: [{
          id: 'child',
          type: 'Sprite',
          transform: {
            position: { x: 100, y: 100 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            skew: { x: 0, y: 0 },
            alpha: 1
          },
          visible: true,
          children: [],
          actions: [],
          triggers: []
        }],
        actions: [],
        triggers: []
      }
    }],
    assets: {
      sprites: [{
        id: 'testSprite',
        url: 'test.png',
        width: 32,
        height: 32,
        frames: 1
      }],
      audio: [{
        id: 'testSound',
        url: 'test.wav',
        type: 'sfx'
      }],
      fonts: [{
        id: 'testFont',
        family: 'Test Font',
        url: 'test.woff2'
      }]
    },
    variables: {
      score: 0,
      level: 1
    }
  };
}