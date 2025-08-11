/**
 * Tests for WCAGValidator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WCAGValidator } from './wcag-validator.js';
import { ThemeTokens, Node } from '../types/core.js';

const createMockTheme = (overrides: Partial<ThemeTokens> = {}): ThemeTokens => ({
  colors: {
    primary: '#007acc',
    secondary: '#666666',
    background: '#ffffff',
    text: '#000000',
    accent: '#ff6600',
    ...overrides.colors
  },
  font: {
    family: 'Arial, sans-serif',
    sizes: {
      small: 12,
      medium: 16,
      large: 24,
      ...overrides.font?.sizes
    },
    ...overrides.font
  },
  spacing: {
    small: 4,
    medium: 8,
    large: 16,
    ...overrides.spacing
  },
  radii: {
    small: 2,
    medium: 4,
    large: 8,
    ...overrides.radii
  }
});

const createMockNode = (id: string, type: string, overrides: any = {}): Node => ({
  id,
  type: type as any,
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
  addChild: vi.fn(),
  removeChild: vi.fn(),
  removeFromParent: vi.fn(),
  getRoot: vi.fn(),
  getDepth: vi.fn(),
  getWorldTransform: vi.fn().mockReturnValue({
    position: { x: 100, y: 100 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    skew: { x: 0, y: 0 },
    alpha: 1
  }),
  isWorldVisible: vi.fn().mockReturnValue(true),
  ...overrides
});

describe('WCAGValidator', () => {
  let validator: WCAGValidator;

  beforeEach(() => {
    validator = new WCAGValidator();
  });

  describe('Color Contrast Validation', () => {
    it('should pass with sufficient contrast for AA level', () => {
      const theme = createMockTheme({
        colors: {
          text: '#000000',
          background: '#ffffff',
          primary: '#0066cc',
          secondary: '#666666',
          accent: '#cc6600'
        }
      });

      const report = validator.validate(theme, [], { targetLevel: 'AA' });
      
      // Should have no violations for good contrast
      const contrastViolations = report.violations.filter(v => 
        v.criterion.includes('Contrast')
      );
      expect(contrastViolations.length).toBe(0);
    });

    it('should fail with insufficient contrast', () => {
      const theme = createMockTheme({
        colors: {
          text: '#cccccc', // Light gray on white - poor contrast
          background: '#ffffff',
          primary: '#dddddd',
          secondary: '#eeeeee',
          accent: '#f0f0f0'
        }
      });

      const report = validator.validate(theme, [], { targetLevel: 'AA' });
      
      const contrastViolations = report.violations.filter(v => 
        v.criterion.includes('Contrast')
      );
      expect(contrastViolations.length).toBeGreaterThan(0);
    });

    it('should calculate color contrast ratio correctly', () => {
      const result = validator.calculateColorContrast('#000000', '#ffffff');
      expect(result.ratio).toBeCloseTo(21, 1); // Perfect contrast
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
    });

    it('should handle different color formats', () => {
      const result1 = validator.calculateColorContrast('#000', '#fff');
      const result2 = validator.calculateColorContrast('#000000', '#ffffff');
      
      // Should handle both 3-digit and 6-digit hex
      expect(result1.ratio).toBeCloseTo(result2.ratio, 1);
    });

    it('should require higher contrast for AAA level', () => {
      const theme = createMockTheme({
        colors: {
          text: '#595959', // Passes AA but not AAA
          background: '#ffffff',
          primary: '#007acc',
          secondary: '#666666',
          accent: '#ff6600'
        }
      });

      const reportAA = validator.validate(theme, [], { targetLevel: 'AA' });
      const reportAAA = validator.validate(theme, [], { targetLevel: 'AAA' });
      
      expect(reportAA.violations.length).toBeLessThan(reportAAA.violations.length);
    });
  });

  describe('Text Scaling Validation', () => {
    it('should pass with scalable font sizes', () => {
      const theme = createMockTheme({
        font: {
          family: 'Arial, sans-serif',
          sizes: {
            small: 14,
            medium: 18,
            large: 24
          }
        }
      });

      const report = validator.validate(theme, []);
      
      const scalingViolations = report.violations.filter(v => 
        v.criterion.includes('Resize text')
      );
      expect(scalingViolations.length).toBe(0);
    });

    it('should warn about very small font sizes', () => {
      const theme = createMockTheme({
        font: {
          family: 'Arial, sans-serif',
          sizes: {
            tiny: 8, // Too small
            small: 12,
            medium: 16
          }
        }
      });

      const report = validator.validate(theme, [], { includeWarnings: true });
      
      const scalingWarnings = report.warnings.filter(w => 
        w.criterion.includes('Resize text')
      );
      expect(scalingWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation Validation', () => {
    it('should pass with focusable interactive elements', () => {
      const button = createMockNode('button1', 'Button');
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes);
      
      const keyboardViolations = report.violations.filter(v => 
        v.guideline.includes('Keyboard Accessible')
      );
      expect(keyboardViolations.length).toBe(0);
    });

    it('should fail with non-focusable interactive elements', () => {
      const button = createMockNode('button1', 'Button', {
        visible: false // Not focusable if not visible
      });
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes);
      
      const keyboardViolations = report.violations.filter(v => 
        v.guideline.includes('Keyboard Accessible')
      );
      expect(keyboardViolations.length).toBeGreaterThan(0);
    });

    it('should provide info when no interactive elements exist', () => {
      const group = createMockNode('group1', 'Group');
      const nodes = [group];

      const report = validator.validate(createMockTheme(), nodes, { includeWarnings: true });
      
      const keyboardWarnings = report.warnings.filter(w => 
        w.guideline.includes('Keyboard Accessible')
      );
      expect(keyboardWarnings.length).toBeGreaterThan(0);
      expect(keyboardWarnings[0].severity).toBe('info');
    });
  });

  describe('Semantic Markup Validation', () => {
    it('should pass with proper ARIA labels and roles', () => {
      const button = createMockNode('button1', 'Button', {
        text: 'Click me',
        ariaLabel: 'Submit form'
      });
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes);
      
      const semanticViolations = report.violations.filter(v => 
        v.guideline.includes('Compatible')
      );
      expect(semanticViolations.length).toBe(0);
    });

    it('should fail without accessible names', () => {
      const button = createMockNode('button1', 'Button');
      // No text, ariaLabel, or other accessible name
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes);
      
      const nameViolations = report.violations.filter(v => 
        v.description.includes('accessible name')
      );
      expect(nameViolations.length).toBeGreaterThan(0);
    });

    it('should accept text as accessible name', () => {
      const button = createMockNode('button1', 'Button', {
        text: 'Submit'
      });
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes);
      
      const nameViolations = report.violations.filter(v => 
        v.description.includes('accessible name')
      );
      expect(nameViolations.length).toBe(0);
    });
  });

  describe('Target Size Validation', () => {
    it('should pass with adequate target sizes', () => {
      const button = createMockNode('button1', 'Button', {
        width: 48,
        height: 48
      });
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes, { targetLevel: 'AAA' });
      
      const sizeViolations = report.violations.filter(v => 
        v.criterion.includes('Target Size')
      );
      expect(sizeViolations.length).toBe(0);
    });

    it('should fail with small target sizes', () => {
      const button = createMockNode('button1', 'Button', {
        width: 20,
        height: 20
      });
      const nodes = [button];

      const report = validator.validate(createMockTheme(), nodes, { targetLevel: 'AAA' });
      
      const sizeViolations = report.violations.filter(v => 
        v.criterion.includes('Target Size')
      );
      expect(sizeViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate JSON report by default', () => {
      const theme = createMockTheme();
      const report = validator.validate(theme, []);
      
      const jsonReport = validator.generateReport(report);
      expect(() => JSON.parse(jsonReport)).not.toThrow();
      
      const parsed = JSON.parse(jsonReport);
      expect(parsed.compliant).toBeDefined();
      expect(parsed.score).toBeDefined();
      expect(parsed.violations).toBeDefined();
    });

    it('should generate HTML report', () => {
      const theme = createMockTheme();
      const report = validator.validate(theme, []);
      
      const htmlReport = validator.generateReport(report, 'html');
      expect(htmlReport).toContain('<!DOCTYPE html>');
      expect(htmlReport).toContain('WCAG');
      expect(htmlReport).toContain(`Score: ${report.score}/100`);
    });

    it('should generate text report', () => {
      const theme = createMockTheme();
      const report = validator.validate(theme, []);
      
      const textReport = validator.generateReport(report, 'text');
      expect(textReport).toContain('WCAG');
      expect(textReport).toContain('Accessibility Report');
      expect(textReport).toContain(`Score: ${report.score}/100`);
    });

    it('should include violations in HTML report', () => {
      const theme = createMockTheme({
        colors: {
          text: '#cccccc', // Poor contrast
          background: '#ffffff',
          primary: '#007acc',
          secondary: '#666666',
          accent: '#ff6600'
        }
      });
      
      const report = validator.validate(theme, []);
      const htmlReport = validator.generateReport(report, 'html');
      
      if (report.violations.length > 0) {
        expect(htmlReport).toContain('Violations');
        expect(htmlReport).toContain(report.violations[0].description);
      }
    });
  });

  describe('Compliance Scoring', () => {
    it('should give perfect score for compliant content', () => {
      const theme = createMockTheme();
      const button = createMockNode('button1', 'Button', {
        text: 'Click me',
        width: 48,
        height: 48
      });
      
      const report = validator.validate(theme, [button]);
      expect(report.score).toBe(100);
      expect(report.compliant).toBe(true);
    });

    it('should reduce score for violations', () => {
      const theme = createMockTheme({
        colors: {
          text: '#cccccc', // Poor contrast
          background: '#ffffff',
          primary: '#dddddd',
          secondary: '#eeeeee',
          accent: '#f0f0f0'
        }
      });
      
      const report = validator.validate(theme, []);
      expect(report.score).toBeLessThan(100);
      expect(report.compliant).toBe(false);
    });

    it('should provide detailed summary', () => {
      const theme = createMockTheme();
      const button = createMockNode('button1', 'Button', {
        text: 'Click me'
      });
      
      const report = validator.validate(theme, [button]);
      
      expect(report.summary.totalChecks).toBeGreaterThan(0);
      expect(report.summary.passed).toBeDefined();
      expect(report.summary.failed).toBeDefined();
      expect(report.summary.warnings).toBeDefined();
      
      expect(report.summary.passed + report.summary.failed + report.summary.warnings)
        .toBe(report.summary.totalChecks);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty node list', () => {
      const theme = createMockTheme();
      const report = validator.validate(theme, []);
      
      expect(report).toBeDefined();
      expect(report.score).toBeGreaterThan(0);
    });

    it('should handle invalid color values gracefully', () => {
      const theme = createMockTheme({
        colors: {
          text: 'invalid-color',
          background: '#ffffff',
          primary: '#007acc',
          secondary: '#666666',
          accent: '#ff6600'
        }
      });
      
      expect(() => validator.validate(theme, [])).not.toThrow();
    });

    it('should handle nested node structures', () => {
      const parent = createMockNode('parent', 'Group');
      const child = createMockNode('child', 'Button', { text: 'Child Button' });
      parent.children = [child];
      
      const report = validator.validate(createMockTheme(), [parent]);
      
      // Should find the nested button
      expect(report.summary.totalChecks).toBeGreaterThan(0);
    });
  });
});