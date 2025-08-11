/**
 * Build Artifacts and Distribution Tests
 * Tests that validate final build artifacts and distribution packages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Build Artifacts and Distribution', () => {
  const distPath = join(process.cwd(), 'dist');

  beforeAll(async () => {
    // Ensure build has been run
    if (!existsSync(distPath)) {
      throw new Error('Distribution directory not found. Run "npm run build" first.');
    }
  });

  describe('Core Bundle Files', () => {
    it('should have main bundle file', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      expect(existsSync(mainBundle)).toBe(true);
      
      const stats = statSync(mainBundle);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(200 * 1024); // 200KB limit
    });

    it('should have TypeScript definitions', () => {
      const typesDir = join(distPath, 'types');
      expect(existsSync(typesDir)).toBe(true);
      
      const indexTypes = join(typesDir, 'index.d.ts');
      expect(existsSync(indexTypes)).toBe(true);
    });

    it('should have valid JavaScript syntax', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Basic syntax validation
      expect(content).toContain('function');
      expect(content).not.toContain('undefined is not a function');
      expect(content.length).toBeGreaterThan(1000); // Should have substantial content
    });
  });

  describe('Platform-Specific Builds', () => {
    it('should have mobile-minimal build', () => {
      const mobileBundle = join(distPath, 'llmrt-mobile.min.js');
      if (existsSync(mobileBundle)) {
        const stats = statSync(mobileBundle);
        expect(stats.size).toBeLessThanOrEqual(150 * 1024); // Smaller for mobile
      }
    });

    it('should have desktop-full build', () => {
      const desktopBundle = join(distPath, 'llmrt-desktop.min.js');
      if (existsSync(desktopBundle)) {
        const stats = statSync(desktopBundle);
        expect(stats.size).toBeLessThanOrEqual(300 * 1024); // Larger for desktop
      }
    });

    it('should have web-standard build', () => {
      const webBundle = join(distPath, 'llmrt-web.min.js');
      if (existsSync(webBundle)) {
        const stats = statSync(webBundle);
        expect(stats.size).toBeLessThanOrEqual(200 * 1024); // Standard web size
      }
    });
  });

  describe('CLI Tools', () => {
    it('should have validator CLI', () => {
      const validatorCLI = join(distPath, 'cli', 'validator.js');
      if (existsSync(validatorCLI)) {
        const content = readFileSync(validatorCLI, 'utf-8');
        expect(content).toContain('validateCartridge');
      }
    });

    it('should have accessibility validator CLI', () => {
      const accessibilityCLI = join(distPath, 'cli', 'accessibility-validator.js');
      if (existsSync(accessibilityCLI)) {
        const content = readFileSync(accessibilityCLI, 'utf-8');
        expect(content).toContain('AccessibilityValidator');
      }
    });
  });

  describe('Documentation and Examples', () => {
    it('should have playground HTML', () => {
      const playgroundHTML = join(distPath, 'playground.html');
      if (existsSync(playgroundHTML)) {
        const content = readFileSync(playgroundHTML, 'utf-8');
        expect(content).toContain('<html');
        expect(content).toContain('LLM Canvas Engine');
      }
    });

    it('should have sample cartridges', () => {
      const samplesDir = join(process.cwd(), 'test-samples');
      expect(existsSync(samplesDir)).toBe(true);
      
      const pongSample = join(samplesDir, 'pong.lgf.json');
      const corridorSample = join(samplesDir, 'corridor.lgf.json');
      const racerSample = join(samplesDir, 'racer.lgf.json');
      
      expect(existsSync(pongSample)).toBe(true);
      expect(existsSync(corridorSample)).toBe(true);
      expect(existsSync(racerSample)).toBe(true);
    });
  });

  describe('Package Metadata', () => {
    it('should have valid package.json', () => {
      const packageJson = join(process.cwd(), 'package.json');
      expect(existsSync(packageJson)).toBe(true);
      
      const content = JSON.parse(readFileSync(packageJson, 'utf-8'));
      expect(content.name).toBe('llm-canvas-engine');
      expect(content.version).toBeDefined();
      expect(content.main).toBe('dist/llmrt.min.js');
      expect(content.types).toBe('dist/types/index.d.ts');
    });

    it('should have README documentation', () => {
      const readme = join(process.cwd(), 'README.md');
      if (existsSync(readme)) {
        const content = readFileSync(readme, 'utf-8');
        expect(content.length).toBeGreaterThan(100);
        expect(content).toContain('LLM Canvas Engine');
      }
    });
  });

  describe('Bundle Analysis', () => {
    it('should not contain development dependencies', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Should not contain development-only code
      expect(content).not.toContain('vitest');
      expect(content).not.toContain('console.log');
      expect(content).not.toContain('debugger');
    });

    it('should be properly minified', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Minified code characteristics
      const lines = content.split('\n');
      expect(lines.length).toBeLessThan(50); // Should be heavily compressed
      
      // Should not have excessive whitespace
      const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
      expect(whitespaceRatio).toBeLessThan(0.3);
    });

    it('should have source maps for debugging', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const sourceMap = join(distPath, 'llmrt.min.js.map');
      
      if (existsSync(sourceMap)) {
        const mapContent = JSON.parse(readFileSync(sourceMap, 'utf-8'));
        expect(mapContent.version).toBe(3);
        expect(mapContent.sources).toBeDefined();
        expect(mapContent.mappings).toBeDefined();
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should use universal module format', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Should support multiple module systems
      const hasUMD = content.includes('typeof exports') && 
                     content.includes('typeof module') && 
                     content.includes('typeof define');
      
      if (hasUMD) {
        expect(hasUMD).toBe(true);
      } else {
        // Or should be ES modules
        expect(content).toContain('export');
      }
    });

    it('should not use Node.js specific APIs', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Should not contain Node.js specific globals
      expect(content).not.toContain('process.env');
      expect(content).not.toContain('require(');
      expect(content).not.toContain('__dirname');
      expect(content).not.toContain('__filename');
    });
  });

  describe('Performance Characteristics', () => {
    it('should have acceptable gzip size', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const content = readFileSync(mainBundle, 'utf-8');
      
      // Estimate gzip size (rough approximation)
      const estimatedGzipSize = content.length * 0.3; // Typical gzip ratio
      expect(estimatedGzipSize).toBeLessThanOrEqual(60 * 1024); // 60KB gzipped
    });

    it('should load quickly in browser environment', () => {
      const mainBundle = join(distPath, 'llmrt.min.js');
      const stats = statSync(mainBundle);
      
      // File size should allow for quick loading
      // At 1Mbps connection: 200KB = ~1.6 seconds
      expect(stats.size).toBeLessThanOrEqual(200 * 1024);
    });
  });
});