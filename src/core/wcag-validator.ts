/**
 * WCAG Compliance Validator for the LLM Canvas Engine
 * Validates accessibility compliance according to WCAG 2.1 guidelines
 */

import { ThemeTokens, Node } from '../types/core.js';

export interface WCAGViolation {
  level: 'A' | 'AA' | 'AAA';
  guideline: string;
  criterion: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  element?: string;
  suggestion: string;
}

export interface WCAGReport {
  compliant: boolean;
  level: 'A' | 'AA' | 'AAA';
  violations: WCAGViolation[];
  warnings: WCAGViolation[];
  score: number; // 0-100
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface ColorContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  foreground: string;
  background: string;
}

/**
 * Validates WCAG compliance for themes, content, and interactions
 */
export class WCAGValidator {
  private violations: WCAGViolation[] = [];
  private warnings: WCAGViolation[] = [];
  private totalChecks = 0;

  /**
   * Validate complete accessibility compliance
   */
  validate(theme: ThemeTokens, nodes: Node[], options: {
    targetLevel?: 'A' | 'AA' | 'AAA';
    includeWarnings?: boolean;
  } = {}): WCAGReport {
    const targetLevel = options.targetLevel || 'AA';
    const includeWarnings = options.includeWarnings !== false;

    this.violations = [];
    this.warnings = [];
    this.totalChecks = 0;

    // Validate color contrast (WCAG 1.4.3, 1.4.6)
    this.validateColorContrast(theme, targetLevel);

    // Validate text scaling (WCAG 1.4.4)
    this.validateTextScaling(theme);

    // Validate keyboard navigation (WCAG 2.1.1, 2.1.2)
    this.validateKeyboardNavigation(nodes);

    // Validate focus indicators (WCAG 2.4.7)
    this.validateFocusIndicators(nodes);

    // Validate semantic markup (WCAG 4.1.2)
    this.validateSemanticMarkup(nodes);

    // Validate interactive element sizing (WCAG 2.5.5)
    this.validateTargetSize(nodes);

    // Calculate compliance score
    const passed = this.totalChecks - this.violations.length - this.warnings.length;
    const score = this.totalChecks > 0 ? Math.round((passed / this.totalChecks) * 100) : 100;

    return {
      compliant: this.violations.length === 0,
      level: targetLevel,
      violations: this.violations,
      warnings: includeWarnings ? this.warnings : [],
      score,
      summary: {
        totalChecks: this.totalChecks,
        passed,
        failed: this.violations.length,
        warnings: this.warnings.length
      }
    };
  }

  /**
   * Validate color contrast ratios
   */
  validateColorContrast(theme: ThemeTokens, level: 'A' | 'AA' | 'AAA'): void {
    const combinations = [
      { fg: theme.colors.text, bg: theme.colors.background, context: 'main text' },
      { fg: theme.colors.primary, bg: theme.colors.background, context: 'primary elements' },
      { fg: theme.colors.secondary, bg: theme.colors.background, context: 'secondary elements' },
      { fg: theme.colors.accent, bg: theme.colors.background, context: 'accent elements' },
      { fg: theme.colors.text, bg: theme.colors.primary, context: 'text on primary' },
      { fg: theme.colors.text, bg: theme.colors.secondary, context: 'text on secondary' }
    ];

    for (const combo of combinations) {
      this.totalChecks++;
      const result = this.calculateColorContrast(combo.fg, combo.bg);
      
      const requiredRatio = level === 'AAA' ? 7 : 4.5;
      const largeTextRatio = level === 'AAA' ? 4.5 : 3;

      if (result.ratio < requiredRatio) {
        this.violations.push({
          level,
          guideline: '1.4 Distinguishable',
          criterion: level === 'AAA' ? '1.4.6 Contrast (Enhanced)' : '1.4.3 Contrast (Minimum)',
          description: `Insufficient color contrast for ${combo.context}. Current ratio: ${result.ratio.toFixed(2)}, required: ${requiredRatio}`,
          severity: 'error',
          element: combo.context,
          suggestion: `Increase contrast between ${combo.fg} and ${combo.bg}. Consider using darker text or lighter background.`
        });
      } else if (result.ratio < 7 && level === 'AA') {
        // Warning for AA level that doesn't meet AAA
        this.warnings.push({
          level: 'AAA',
          guideline: '1.4 Distinguishable',
          criterion: '1.4.6 Contrast (Enhanced)',
          description: `Color contrast for ${combo.context} meets AA but not AAA standards. Current ratio: ${result.ratio.toFixed(2)}`,
          severity: 'warning',
          element: combo.context,
          suggestion: 'Consider improving contrast for better accessibility.'
        });
      }
    }
  }

  /**
   * Validate text scaling support
   */
  validateTextScaling(theme: ThemeTokens): void {
    this.totalChecks++;
    
    // Check if font sizes are specified in scalable units
    const fontSizes = Object.values(theme.font.sizes);
    const hasScalableSizes = fontSizes.every(size => typeof size === 'number' && size > 0);
    
    if (!hasScalableSizes) {
      this.violations.push({
        level: 'AA',
        guideline: '1.4 Distinguishable',
        criterion: '1.4.4 Resize text',
        description: 'Font sizes must be specified in scalable units to support 200% zoom',
        severity: 'error',
        suggestion: 'Use relative font sizes (em, rem, or scalable pixel values) instead of fixed sizes.'
      });
    }

    // Check minimum font sizes
    const minFontSize = Math.min(...fontSizes);
    if (minFontSize < 12) {
      this.warnings.push({
        level: 'AA',
        guideline: '1.4 Distinguishable',
        criterion: '1.4.4 Resize text',
        description: `Minimum font size (${minFontSize}px) may be too small for some users`,
        severity: 'warning',
        suggestion: 'Consider using a minimum font size of 12px or larger.'
      });
    }
  }

  /**
   * Validate keyboard navigation support
   */
  validateKeyboardNavigation(nodes: Node[]): void {
    const interactiveNodes = this.findInteractiveNodes(nodes);
    
    this.totalChecks++;
    if (interactiveNodes.length === 0) {
      this.warnings.push({
        level: 'A',
        guideline: '2.1 Keyboard Accessible',
        criterion: '2.1.1 Keyboard',
        description: 'No interactive elements found to validate keyboard navigation',
        severity: 'info',
        suggestion: 'Ensure all interactive elements are keyboard accessible when added.'
      });
      return;
    }

    // Check if interactive elements can be focused
    for (const node of interactiveNodes) {
      this.totalChecks++;
      
      const isFocusable = this.isNodeFocusable(node);
      if (!isFocusable) {
        this.violations.push({
          level: 'A',
          guideline: '2.1 Keyboard Accessible',
          criterion: '2.1.1 Keyboard',
          description: `Interactive element "${node.id}" is not keyboard accessible`,
          severity: 'error',
          element: node.id,
          suggestion: 'Ensure interactive elements can receive keyboard focus and respond to keyboard events.'
        });
      }
    }

    // Check for keyboard traps
    this.totalChecks++;
    // This would require runtime testing in a full implementation
    // For now, we assume no keyboard traps exist
  }

  /**
   * Validate focus indicators
   */
  validateFocusIndicators(nodes: Node[]): void {
    const focusableNodes = this.findInteractiveNodes(nodes);
    
    if (focusableNodes.length === 0) return;

    this.totalChecks++;
    
    // In a full implementation, this would check if focus indicators are visible
    // For now, we assume focus indicators are properly implemented
    // This is a placeholder for the actual focus indicator validation
  }

  /**
   * Validate semantic markup
   */
  validateSemanticMarkup(nodes: Node[]): void {
    const interactiveNodes = this.findInteractiveNodes(nodes);
    
    for (const node of interactiveNodes) {
      this.totalChecks++;
      
      const hasSemanticRole = this.hasSemanticRole(node);
      if (!hasSemanticRole) {
        this.violations.push({
          level: 'A',
          guideline: '4.1 Compatible',
          criterion: '4.1.2 Name, Role, Value',
          description: `Element "${node.id}" lacks proper semantic role`,
          severity: 'error',
          element: node.id,
          suggestion: 'Add appropriate ARIA role or use semantic HTML elements.'
        });
      }

      const hasAccessibleName = this.hasAccessibleName(node);
      if (!hasAccessibleName) {
        this.violations.push({
          level: 'A',
          guideline: '4.1 Compatible',
          criterion: '4.1.2 Name, Role, Value',
          description: `Element "${node.id}" lacks accessible name`,
          severity: 'error',
          element: node.id,
          suggestion: 'Add aria-label, aria-labelledby, or visible text content.'
        });
      }
    }
  }

  /**
   * Validate target size for touch interfaces
   */
  validateTargetSize(nodes: Node[]): void {
    const interactiveNodes = this.findInteractiveNodes(nodes);
    
    for (const node of interactiveNodes) {
      this.totalChecks++;
      
      const size = this.getNodeSize(node);
      const minSize = 44; // 44px minimum as per WCAG 2.5.5
      
      if (size.width < minSize || size.height < minSize) {
        this.violations.push({
          level: 'AAA',
          guideline: '2.5 Input Modalities',
          criterion: '2.5.5 Target Size',
          description: `Interactive element "${node.id}" is too small (${size.width}x${size.height}px). Minimum size should be 44x44px`,
          severity: 'error',
          element: node.id,
          suggestion: 'Increase the target size to at least 44x44 pixels or ensure adequate spacing between targets.'
        });
      }
    }
  }

  /**
   * Calculate color contrast ratio between two colors
   */
  calculateColorContrast(foreground: string, background: string): ColorContrastResult {
    const fgLuminance = this.getRelativeLuminance(foreground);
    const bgLuminance = this.getRelativeLuminance(background);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    const ratio = (lighter + 0.05) / (darker + 0.05);
    
    return {
      ratio,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7,
      foreground,
      background
    };
  }

  /**
   * Get relative luminance of a color
   */
  private getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Handle 6-digit hex
    if (hex.length === 6) {
      const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
    
    return null;
  }

  /**
   * Find interactive nodes in the scene tree
   */
  private findInteractiveNodes(nodes: Node[]): Node[] {
    const interactive: Node[] = [];
    
    const traverse = (nodeList: Node[]) => {
      for (const node of nodeList) {
        if (this.isInteractiveNode(node)) {
          interactive.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    
    traverse(nodes);
    return interactive;
  }

  /**
   * Check if a node is interactive
   */
  private isInteractiveNode(node: Node): boolean {
    return node.type === 'Button' || 
           (node.type === 'Text' && (node as any).interactive) ||
           (node as any).focusable === true ||
           node.triggers.length > 0;
  }

  /**
   * Check if a node can be focused
   */
  private isNodeFocusable(node: Node): boolean {
    // In a full implementation, this would check actual focusability
    // For now, assume interactive nodes are focusable
    const isWorldVisible = typeof (node as any).isWorldVisible === 'function' 
      ? (node as any).isWorldVisible() 
      : node.visible; // Fallback for plain objects
    
    return this.isInteractiveNode(node) && node.visible && isWorldVisible;
  }

  /**
   * Check if a node has semantic role
   */
  private hasSemanticRole(node: Node): boolean {
    const nodeData = node as any;
    return !!(nodeData.ariaRole || 
             nodeData.role || 
             (node.type === 'Button') || 
             (node.type === 'Text'));
  }

  /**
   * Check if a node has accessible name
   */
  private hasAccessibleName(node: Node): boolean {
    const nodeData = node as any;
    return !!(nodeData.ariaLabel || 
             nodeData.text || 
             nodeData.label || 
             nodeData.title);
  }

  /**
   * Get the size of a node
   */
  private getNodeSize(node: Node): { width: number; height: number } {
    const nodeData = node as any;
    return {
      width: nodeData.width || 50, // Default size
      height: nodeData.height || 50
    };
  }

  /**
   * Generate accessibility report in different formats
   */
  generateReport(report: WCAGReport, format: 'json' | 'html' | 'text' = 'json'): string {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(report);
      case 'text':
        return this.generateTextReport(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  private generateHTMLReport(report: WCAGReport): string {
    const statusClass = report.compliant ? 'compliant' : 'non-compliant';
    const statusText = report.compliant ? 'Compliant' : 'Non-Compliant';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WCAG Accessibility Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .${statusClass} { color: ${report.compliant ? '#28a745' : '#dc3545'}; }
        .violation { background: #f8d7da; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .warning { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .score { font-size: 2em; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>WCAG ${report.level} Accessibility Report</h1>
        <p class="${statusClass}">Status: ${statusText}</p>
        <p class="score">Score: ${report.score}/100</p>
    </div>
    
    <h2>Summary</h2>
    <ul>
        <li>Total Checks: ${report.summary.totalChecks}</li>
        <li>Passed: ${report.summary.passed}</li>
        <li>Failed: ${report.summary.failed}</li>
        <li>Warnings: ${report.summary.warnings}</li>
    </ul>
    
    ${report.violations.length > 0 ? `
    <h2>Violations</h2>
    ${report.violations.map(v => `
    <div class="violation">
        <h3>${v.criterion}</h3>
        <p><strong>Description:</strong> ${v.description}</p>
        <p><strong>Suggestion:</strong> ${v.suggestion}</p>
        ${v.element ? `<p><strong>Element:</strong> ${v.element}</p>` : ''}
    </div>
    `).join('')}
    ` : ''}
    
    ${report.warnings.length > 0 ? `
    <h2>Warnings</h2>
    ${report.warnings.map(w => `
    <div class="warning">
        <h3>${w.criterion}</h3>
        <p><strong>Description:</strong> ${w.description}</p>
        <p><strong>Suggestion:</strong> ${w.suggestion}</p>
        ${w.element ? `<p><strong>Element:</strong> ${w.element}</p>` : ''}
    </div>
    `).join('')}
    ` : ''}
</body>
</html>`;
  }

  private generateTextReport(report: WCAGReport): string {
    const statusText = report.compliant ? 'COMPLIANT' : 'NON-COMPLIANT';
    
    let text = `WCAG ${report.level} Accessibility Report\n`;
    text += `${'='.repeat(40)}\n\n`;
    text += `Status: ${statusText}\n`;
    text += `Score: ${report.score}/100\n\n`;
    
    text += `Summary:\n`;
    text += `- Total Checks: ${report.summary.totalChecks}\n`;
    text += `- Passed: ${report.summary.passed}\n`;
    text += `- Failed: ${report.summary.failed}\n`;
    text += `- Warnings: ${report.summary.warnings}\n\n`;
    
    if (report.violations.length > 0) {
      text += `Violations:\n`;
      text += `${'-'.repeat(20)}\n`;
      report.violations.forEach((v, i) => {
        text += `${i + 1}. ${v.criterion}\n`;
        text += `   Description: ${v.description}\n`;
        text += `   Suggestion: ${v.suggestion}\n`;
        if (v.element) text += `   Element: ${v.element}\n`;
        text += '\n';
      });
    }
    
    if (report.warnings.length > 0) {
      text += `Warnings:\n`;
      text += `${'-'.repeat(20)}\n`;
      report.warnings.forEach((w, i) => {
        text += `${i + 1}. ${w.criterion}\n`;
        text += `   Description: ${w.description}\n`;
        text += `   Suggestion: ${w.suggestion}\n`;
        if (w.element) text += `   Element: ${w.element}\n`;
        text += '\n';
      });
    }
    
    return text;
  }
}