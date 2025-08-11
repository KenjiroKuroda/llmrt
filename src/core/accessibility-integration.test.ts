/**
 * Integration tests for accessibility features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMRTEngineImpl } from './engine.js';
import { AccessibilityManager } from './accessibility-manager.js';
import { WCAGValidator } from './wcag-validator.js';
import { LGFCartridge, ThemeTokens } from '../types/core.js';

// Mock DOM methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 100 }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    imageSmoothingEnabled: true
  });
  canvas.getBoundingClientRect = vi.fn().mockReturnValue({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  });
  return canvas;
};

const createTestCartridge = (): LGFCartridge => ({
  version: '1.0',
  metadata: {
    title: 'Accessibility Test Game',
    author: 'Test Author',
    description: 'Test game for accessibility features'
  },
  theme: {
    colors: {
      primary: '#007acc',
      secondary: '#666666',
      background: '#ffffff',
      text: '#000000',
      accent: '#ff6600'
    },
    font: {
      family: 'Arial, sans-serif',
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
            id: 'start-button',
            type: 'Button',
            transform: {
              position: { x: 400, y: 300 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: 'Start Game',
            width: 120,
            height: 48
          } as any,
          {
            id: 'settings-button',
            type: 'Button',
            transform: {
              position: { x: 400, y: 380 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: 'Settings',
            width: 100,
            height: 48
          } as any,
          {
            id: 'title-text',
            type: 'Text',
            transform: {
              position: { x: 400, y: 200 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              skew: { x: 0, y: 0 },
              alpha: 1
            },
            visible: true,
            children: [],
            actions: [],
            triggers: [],
            text: 'Accessibility Test Game',
            fontSize: 24
          } as any
        ],
        actions: [],
        triggers: []
      } as any
    }
  ],
  assets: {
    sprites: [],
    audio: [],
    fonts: []
  },
  variables: {}
});

describe('Accessibility Integration', () => {
  let engine: LLMRTEngineImpl;
  let canvas: HTMLCanvasElement;
  let accessibilityManager: AccessibilityManager;
  let wcagValidator: WCAGValidator;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    canvas = createMockCanvas();
    document.body.appendChild(canvas);
    
    engine = new LLMRTEngineImpl({
      enableKeyboardNavigation: true,
      enableScreenReader: true,
      enableHighContrast: false,
      textScaling: 1.0,
      enableFocusIndicators: true,
      announceStateChanges: true
    });
    
    accessibilityManager = engine.getAccessibilityManager();
    wcagValidator = new WCAGValidator();
  });

  afterEach(() => {
    accessibilityManager.cleanup();
    document.body.innerHTML = '';
  });

  describe('Engine Integration', () => {
    it('should initialize accessibility manager with engine', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      expect(accessibilityManager).toBeDefined();
      expect(canvas.getAttribute('role')).toBe('application');
    });

    it('should update accessibility manager with scene changes', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      // Simulate scene update
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      const state = accessibilityManager.getAccessibilityState();
      expect(state.focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Accessibility', () => {
    it('should validate theme for WCAG compliance', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const report = wcagValidator.validate(cartridge.theme, []);
      expect(report).toBeDefined();
      expect(report.score).toBeGreaterThan(0);
    });

    it('should apply high contrast theme when toggled', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      accessibilityManager.setTheme(cartridge.theme);
      
      const highContrastTheme = accessibilityManager.toggleHighContrast();
      
      expect(highContrastTheme.colors.background).toBe('#000000');
      expect(highContrastTheme.colors.text).toBe('#ffffff');
    });

    it('should scale text according to accessibility settings', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      accessibilityManager.setTextScaling(1.5);
      expect(accessibilityManager.getTextScaling()).toBe(1.5);
      
      const highContrastTheme = accessibilityManager.toggleHighContrast();
      expect(highContrastTheme.font.sizes.medium).toBe(24); // 16 * 1.5
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate between focusable elements', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      // Update with scene nodes
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      // Focus first element
      const success = accessibilityManager.focusNode('start-button');
      expect(success).toBe(true);
      
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('start-button');
    });

    it('should handle keyboard input for navigation', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      // Mock key press
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'focus_next';
      });
      
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus).toBeTruthy();
    });
  });

  describe('Screen Reader Support', () => {
    it('should create ARIA live region for announcements', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeTruthy();
    });

    it('should announce focus changes', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      accessibilityManager.focusNode('start-button');
      
      const liveRegion = document.querySelector('[aria-live]') as HTMLElement;
      expect(liveRegion.textContent).toContain('Start Game');
    });
  });

  describe('WCAG Compliance Validation', () => {
    it('should validate complete cartridge for accessibility', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const scene = cartridge.scenes[0];
      const report = wcagValidator.validate(cartridge.theme, [scene.root], {
        targetLevel: 'AA',
        includeWarnings: true
      });
      
      expect(report.compliant).toBeDefined();
      expect(report.score).toBeGreaterThan(0);
      expect(report.summary.totalChecks).toBeGreaterThan(0);
    });

    it('should generate accessibility report', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const scene = cartridge.scenes[0];
      const report = wcagValidator.validate(cartridge.theme, [scene.root]);
      
      const htmlReport = wcagValidator.generateReport(report, 'html');
      expect(htmlReport).toContain('WCAG');
      expect(htmlReport).toContain('Accessibility Report');
      
      const textReport = wcagValidator.generateReport(report, 'text');
      expect(textReport).toContain('WCAG');
      expect(textReport).toContain('Score:');
    });

    it('should identify accessibility violations', async () => {
      // Create cartridge with accessibility issues
      const cartridge = createTestCartridge();
      cartridge.theme.colors.text = '#cccccc'; // Poor contrast
      
      // Add button without accessible name
      const badButton = {
        id: 'bad-button',
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
        width: 20, // Too small
        height: 20
      };
      
      cartridge.scenes[0].root.children.push(badButton as any);
      
      await engine.loadCartridge(cartridge);
      
      const scene = cartridge.scenes[0];
      const report = wcagValidator.validate(cartridge.theme, [scene.root], {
        targetLevel: 'AA'
      });
      
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.compliant).toBe(false);
      expect(report.score).toBeLessThan(100);
    });
  });

  describe('Focus Management', () => {
    it('should show focus indicators for focused elements', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      accessibilityManager.focusNode('start-button');
      
      // Check that focus indicator is created and positioned
      const focusIndicator = document.querySelector('div[aria-hidden="true"]') as HTMLElement;
      expect(focusIndicator).toBeTruthy();
      expect(focusIndicator.style.display).toBe('block');
    });

    it('should clear focus when escape is pressed', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      const inputManager = engine.getInputManager();
      inputManager.initialize(canvas);
      accessibilityManager.initialize(canvas, inputManager);
      
      const scene = cartridge.scenes[0];
      accessibilityManager.update([scene.root]);
      
      accessibilityManager.focusNode('start-button');
      expect(accessibilityManager.getCurrentFocus()).toBeTruthy();
      
      // Mock escape key
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'cancel';
      });
      
      accessibilityManager.update([scene.root]);
      expect(accessibilityManager.getCurrentFocus()).toBeNull();
    });
  });

  describe('Responsive Design', () => {
    it('should maintain accessibility at different text scales', async () => {
      const cartridge = createTestCartridge();
      await engine.loadCartridge(cartridge);
      
      // Test different text scaling levels
      const scales = [0.8, 1.0, 1.5, 2.0];
      
      for (const scale of scales) {
        accessibilityManager.setTextScaling(scale);
        expect(accessibilityManager.getTextScaling()).toBe(scale);
        
        const highContrastTheme = accessibilityManager.toggleHighContrast();
        expect(highContrastTheme.font.sizes.medium).toBeCloseTo(16 * scale, 0);
        
        // Toggle back to normal
        accessibilityManager.toggleHighContrast();
      }
    });

    it('should validate target sizes meet minimum requirements', async () => {
      const cartridge = createTestCartridge();
      
      // Ensure buttons meet minimum size requirements
      const buttons = cartridge.scenes[0].root.children.filter(child => child.type === 'Button');
      for (const button of buttons) {
        const buttonData = button as any;
        expect(buttonData.width).toBeGreaterThanOrEqual(44);
        expect(buttonData.height).toBeGreaterThanOrEqual(44);
      }
      
      await engine.loadCartridge(cartridge);
      
      const scene = cartridge.scenes[0];
      const report = wcagValidator.validate(cartridge.theme, [scene.root], {
        targetLevel: 'AAA'
      });
      
      const sizeViolations = report.violations.filter(v => 
        v.criterion.includes('Target Size')
      );
      expect(sizeViolations.length).toBe(0);
    });
  });
});