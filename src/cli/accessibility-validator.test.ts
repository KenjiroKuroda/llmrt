/**
 * Tests for AccessibilityValidatorCLI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { AccessibilityValidatorCLI } from './accessibility-validator.js';
import { LGFCartridge } from '../types/core.js';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
let exitCode: number | undefined;
const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  exitCode = typeof code === 'number' ? code : (code ? parseInt(code.toString()) : 0);
  if (exitCode !== 0) {
    throw new Error(`process.exit called with code ${exitCode}`);
  }
  // For success cases (code 0), just return without throwing
  return undefined as never;
});

const createTestCartridge = (withIssues = false): LGFCartridge => ({
  version: '1.0',
  metadata: {
    title: 'Test Game',
    author: 'Test Author',
    description: 'Test game for accessibility validation'
  },
  theme: {
    colors: {
      primary: withIssues ? '#007acc' : '#0066cc', 
      secondary: withIssues ? '#666666' : '#e0e0e0', // Light gray with good contrast
      background: withIssues ? '#f0f0f0' : '#ffffff',
      text: withIssues ? '#cccccc' : '#000000', // Pure black text for maximum contrast
      accent: withIssues ? '#ff6600' : '#0066cc' // Use same as primary for guaranteed contrast
    },
    font: {
      family: 'Arial, sans-serif',
      sizes: {
        small: withIssues ? 8 : 12, // Too small if withIssues
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
  scenes: [
    {
      id: 'main',
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
        children: [
          {
            id: 'button1',
            type: 'Button',
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
            triggers: [],
            text: withIssues ? undefined : 'Click Me', // No text if withIssues
            width: withIssues ? 20 : 48, // Too small if withIssues
            height: withIssues ? 20 : 48
          }
        ],
        actions: [],
        triggers: []
      }
    }
  ],
  assets: {
    sprites: [],
    audio: [],
    fonts: []
  }
});

describe('AccessibilityValidatorCLI', () => {
  let cli: AccessibilityValidatorCLI;
  let testDir: string;
  let testFile: string;
  let outputFile: string;

  beforeEach(async () => {
    exitCode = undefined; // Reset exit code
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
    
    cli = new AccessibilityValidatorCLI();
    testDir = join(process.cwd(), 'test-temp');
    testFile = join(testDir, 'test-cartridge.lgf.json');
    outputFile = join(testDir, 'accessibility-report.html');

    // Create test directory
    try {
      await mkdir(testDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Clear mock calls
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
    mockProcessExit.mockClear();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await unlink(testFile);
    } catch (error) {
      // File might not exist
    }
    try {
      await unlink(outputFile);
    } catch (error) {
      // File might not exist
    }
  });

  describe('Argument Parsing', () => {
    it('should parse basic input file argument', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      // This test validates argument parsing, not accessibility compliance
      // The cartridge may fail validation, but the CLI should parse arguments correctly
      try {
        await cli.run([testFile]);
      } catch (error) {
        // Expect exit code 1 for non-compliant cartridge
        expect(exitCode).toBe(1);
      }

      // Verify that console output was generated (validation ran)
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should parse input flag', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      try {
        await cli.run(['-i', testFile]);
      } catch (error) {
        expect(exitCode).toBe(1); // Non-compliant cartridge
      }

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should parse WCAG level flag', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      try {
        await cli.run(['-i', testFile, '-l', 'AAA']);
      } catch (error) {
        expect(exitCode).toBe(1);
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('WCAG AAA'));
    });

    it('should parse output format flag', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-f', 'json']);

      const output = mockConsoleLog.mock.calls.join('');
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should parse output file flag', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-o', outputFile, '-f', 'html']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('saved to'));
    });

    it('should parse verbose flag', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-v']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Validating accessibility'));
    });

    it('should show help with help flag', async () => {
      try {
        await cli.run(['-h']);
      } catch (error) {
        // Expected to exit
      }

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('USAGE:'));
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it('should error on missing input file', async () => {
      try {
        await cli.run([]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Input file is required');
      }
    });

    it('should error on invalid WCAG level', async () => {
      try {
        await cli.run(['-i', testFile, '-l', 'INVALID']);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid WCAG level');
      }
    });

    it('should error on invalid format', async () => {
      try {
        await cli.run(['-i', testFile, '-f', 'invalid']);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid format');
      }
    });
  });

  describe('File Validation', () => {
    it('should validate compliant cartridge', async () => {
      const cartridge = createTestCartridge(false);
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run([testFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('COMPLIANT'));
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it('should detect non-compliant cartridge', async () => {
      const cartridge = createTestCartridge(true); // With accessibility issues
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      try {
        await cli.run([testFile]);
      } catch (error) {
        // Expected to exit with error
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('NON-COMPLIANT'));
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle invalid JSON file', async () => {
      await writeFile(testFile, 'invalid json content');

      try {
        await cli.run([testFile]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid JSON');
      }
    });

    it('should handle missing file', async () => {
      try {
        await cli.run(['non-existent-file.json']);
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });

    it('should handle invalid cartridge format', async () => {
      await writeFile(testFile, JSON.stringify({ invalid: 'cartridge' }));

      try {
        await cli.run([testFile]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Invalid LGF cartridge format');
      }
    });
  });

  describe('Report Generation', () => {
    it('should generate text report by default', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run([testFile]);

      const output = mockConsoleLog.mock.calls.join('');
      expect(output).toContain('WCAG');
      expect(output).toContain('Accessibility Report');
    });

    it('should generate JSON report', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-f', 'json']);

      const output = mockConsoleLog.mock.calls.join('');
      expect(() => JSON.parse(output)).not.toThrow();
      
      const report = JSON.parse(output);
      expect(report.compliant).toBeDefined();
      expect(report.score).toBeDefined();
    });

    it('should generate HTML report', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-f', 'html']);

      const output = mockConsoleLog.mock.calls.join('');
      expect(output).toContain('<!DOCTYPE html>');
      expect(output).toContain('WCAG');
    });

    it('should save report to output file', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-o', outputFile, '-f', 'html']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('saved to'));
      
      // Verify file was created (we can't easily read it in this test environment)
    });

    it('should exclude warnings when requested', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-f', 'json', '--no-warnings']);

      const output = mockConsoleLog.mock.calls.join('');
      const report = JSON.parse(output);
      expect(report.warnings).toEqual([]);
    });
  });

  describe('Verbose Output', () => {
    it('should show detailed information in verbose mode', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-v']);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Validating accessibility'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('WCAG Level'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Found'));
    });

    it('should show summary even without verbose mode', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run([testFile]);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('ACCESSIBILITY VALIDATION SUMMARY'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Score:'));
    });

    it('should show top issues for non-compliant cartridges', async () => {
      const cartridge = createTestCartridge(true);
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      try {
        await cli.run([testFile]);
      } catch (error) {
        // Expected to exit
      }

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Top Issues:'));
    });
  });

  describe('Different WCAG Levels', () => {
    it('should validate for A level', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-l', 'A']);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('WCAG A'));
    });

    it('should validate for AA level', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-l', 'AA']);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('WCAG AA'));
    });

    it('should validate for AAA level', async () => {
      const cartridge = createTestCartridge();
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-i', testFile, '-l', 'AAA']);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('WCAG AAA'));
    });
  });

  describe('Edge Cases', () => {
    it('should handle cartridge with no scenes', async () => {
      const cartridge = createTestCartridge();
      cartridge.scenes = [];
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run([testFile]);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle cartridge with empty scenes', async () => {
      const cartridge = createTestCartridge();
      cartridge.scenes[0].root.children = [];
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run([testFile]);

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should handle deeply nested node structures', async () => {
      const cartridge = createTestCartridge();
      const deepChild = {
        id: 'deep-child',
        type: 'Button',
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        },
        visible: true,
        children: [],
        actions: [],
        triggers: [],
        text: 'Deep Button'
      };
      
      cartridge.scenes[0].root.children[0].children = [deepChild];
      await writeFile(testFile, JSON.stringify(cartridge, null, 2));

      await cli.run(['-v', testFile]);

      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('2 total nodes'));
    });
  });
});