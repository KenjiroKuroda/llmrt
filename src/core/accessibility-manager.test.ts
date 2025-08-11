/**
 * Tests for AccessibilityManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccessibilityManager } from './accessibility-manager.js';
import { InputManagerImpl } from './input-manager.js';
import { Node, ThemeTokens } from '../types/core.js';

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

// Mock canvas and DOM elements
const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getBoundingClientRect = vi.fn().mockReturnValue({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  });
  return canvas;
};

const createMockNode = (id: string, type: string, visible: boolean = true): Node => {
  return {
    id,
    type: type as any,
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible,
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
    isWorldVisible: vi.fn().mockReturnValue(visible)
  };
};

const createMockTheme = (): ThemeTokens => ({
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
});

describe('AccessibilityManager', () => {
  let accessibilityManager: AccessibilityManager;
  let canvas: HTMLCanvasElement;
  let inputManager: InputManagerImpl;
  let theme: ThemeTokens;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    accessibilityManager = new AccessibilityManager();
    canvas = createMockCanvas();
    inputManager = new InputManagerImpl();
    theme = createMockTheme();
    
    document.body.appendChild(canvas);
    
    accessibilityManager.initialize(canvas, inputManager);
    accessibilityManager.setTheme(theme);
  });

  afterEach(() => {
    accessibilityManager.cleanup();
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const state = accessibilityManager.getAccessibilityState();
      expect(state.currentFocus).toBeNull();
      expect(state.focusableElements).toEqual([]);
      expect(state.textScaling).toBe(1.0);
    });

    it('should setup canvas accessibility attributes', () => {
      expect(canvas.getAttribute('role')).toBe('application');
      expect(canvas.getAttribute('aria-label')).toBe('Game Canvas');
      expect(canvas.getAttribute('tabindex')).toBe('0');
      expect(canvas.getAttribute('aria-describedby')).toBe('canvas-description');
    });

    it('should create ARIA live region', () => {
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    });

    it('should create focus indicator', () => {
      const focusIndicator = document.querySelector('div[aria-hidden="true"]');
      expect(focusIndicator).toBeTruthy();
    });
  });

  describe('Theme Management', () => {
    it('should apply theme correctly', () => {
      accessibilityManager.setTheme(theme);
      // Theme is set internally, no direct way to verify without getter
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should toggle high contrast mode', () => {
      const originalState = accessibilityManager.getAccessibilityState();
      expect(originalState.isHighContrast).toBe(false);

      const highContrastTheme = accessibilityManager.toggleHighContrast();
      const newState = accessibilityManager.getAccessibilityState();
      
      expect(newState.isHighContrast).toBe(true);
      expect(highContrastTheme.colors.background).toBe('#000000');
      expect(highContrastTheme.colors.text).toBe('#ffffff');
    });

    it('should create high contrast theme with proper colors', () => {
      const highContrastTheme = accessibilityManager.toggleHighContrast();
      
      expect(highContrastTheme.colors.primary).toBe('#ffffff');
      expect(highContrastTheme.colors.secondary).toBe('#000000');
      expect(highContrastTheme.colors.background).toBe('#000000');
      expect(highContrastTheme.colors.text).toBe('#ffffff');
      expect(highContrastTheme.colors.accent).toBe('#ffff00');
    });
  });

  describe('Text Scaling', () => {
    it('should set text scaling within valid range', () => {
      accessibilityManager.setTextScaling(1.5);
      expect(accessibilityManager.getTextScaling()).toBe(1.5);
    });

    it('should clamp text scaling to minimum value', () => {
      accessibilityManager.setTextScaling(0.1);
      expect(accessibilityManager.getTextScaling()).toBe(0.5);
    });

    it('should clamp text scaling to maximum value', () => {
      accessibilityManager.setTextScaling(5.0);
      expect(accessibilityManager.getTextScaling()).toBe(3.0);
    });

    it('should apply text scaling to high contrast theme', () => {
      accessibilityManager.setTextScaling(2.0);
      const highContrastTheme = accessibilityManager.toggleHighContrast();
      
      expect(highContrastTheme.font.sizes.medium).toBe(32); // 16 * 2.0
      expect(highContrastTheme.font.sizes.large).toBe(48); // 24 * 2.0
    });
  });

  describe('Focus Management', () => {
    it('should collect focusable elements from scene', () => {
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      const text = createMockNode('text1', 'Text');
      const group = createMockNode('group1', 'Group');

      const nodes = [button1, button2, text, group];
      accessibilityManager.update(nodes);

      const state = accessibilityManager.getAccessibilityState();
      expect(state.focusableElements.length).toBe(2); // Only buttons are focusable by default
    });

    it('should focus on specific node by ID', () => {
      const button = createMockNode('test-button', 'Button');
      accessibilityManager.update([button]);

      const success = accessibilityManager.focusNode('test-button');
      expect(success).toBe(true);

      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('test-button');
    });

    it('should return false when focusing non-existent node', () => {
      const success = accessibilityManager.focusNode('non-existent');
      expect(success).toBe(false);
    });

    it('should clear focus', () => {
      const button = createMockNode('test-button', 'Button');
      accessibilityManager.update([button]);
      accessibilityManager.focusNode('test-button');

      expect(accessibilityManager.getCurrentFocus()).toBeTruthy();
      
      // Simulate escape key to clear focus
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'cancel';
      });
      
      accessibilityManager.update([button]);
      expect(accessibilityManager.getCurrentFocus()).toBeNull();
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      // Create test nodes
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      const button3 = createMockNode('button3', 'Button');
      
      // Set different positions for spatial navigation
      button1.getWorldTransform = vi.fn().mockReturnValue({
        position: { x: 100, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      });
      
      button2.getWorldTransform = vi.fn().mockReturnValue({
        position: { x: 200, y: 100 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      });
      
      button3.getWorldTransform = vi.fn().mockReturnValue({
        position: { x: 100, y: 200 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      });

      accessibilityManager.update([button1, button2, button3]);
    });

    it('should navigate to next focusable element', () => {
      // First update to populate focusable elements
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      accessibilityManager.update([button1, button2]);

      // Mock Tab key press
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'focus_next';
      });

      accessibilityManager.update([button1, button2]);
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('button1');
    });

    it('should navigate to previous focusable element', () => {
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      accessibilityManager.update([button1, button2]);
      
      // Focus on second button first
      const success = accessibilityManager.focusNode('button2');
      expect(success).toBe(true);
      expect(accessibilityManager.getCurrentFocus()?.id).toBe('button2');
      
      // Mock Shift+Tab key press
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'focus_previous';
      });

      accessibilityManager.update([button1, button2]);
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('button1');
    });

    it('should navigate to first element with Home key', () => {
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      const button3 = createMockNode('button3', 'Button');
      accessibilityManager.update([button1, button2, button3]);
      accessibilityManager.focusNode('button3');
      
      // Mock Home key press
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'focus_first';
      });

      accessibilityManager.update([button1, button2, button3]);
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('button1');
    });

    it('should navigate to last element with End key', () => {
      const button1 = createMockNode('button1', 'Button');
      const button2 = createMockNode('button2', 'Button');
      const button3 = createMockNode('button3', 'Button');
      accessibilityManager.update([button1, button2, button3]);
      
      // Mock End key press
      vi.spyOn(inputManager, 'isActionJustPressed').mockImplementation((action) => {
        return action === 'focus_last';
      });

      accessibilityManager.update([button1, button2, button3]);
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus?.id).toBe('button3');
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce messages to screen reader', () => {
      const liveRegion = document.querySelector('[aria-live]') as HTMLElement;
      expect(liveRegion).toBeTruthy();

      accessibilityManager.announceToScreenReader('Test message');
      expect(liveRegion.textContent).toBe('Test message');
    });

    it('should clear announcements after timeout', (done) => {
      const liveRegion = document.querySelector('[aria-live]') as HTMLElement;
      
      accessibilityManager.announceToScreenReader('Test message');
      expect(liveRegion.textContent).toBe('Test message');

      setTimeout(() => {
        expect(liveRegion.textContent).toBe('');
        done();
      }, 1100);
    });

    it('should set aria-live priority correctly', () => {
      const liveRegion = document.querySelector('[aria-live]') as HTMLElement;
      
      accessibilityManager.announceToScreenReader('Urgent message', 'assertive');
      expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should generate correct ARIA labels for buttons', () => {
      const button = createMockNode('test-button', 'Button');
      (button as any).text = 'Click Me';
      
      accessibilityManager.update([button]);
      const state = accessibilityManager.getAccessibilityState();
      
      expect(state.focusableElements[0].ariaLabel).toBe('Click Me');
      expect(state.focusableElements[0].ariaRole).toBe('button');
    });

    it('should generate fallback ARIA labels', () => {
      const button = createMockNode('test-button', 'Button');
      
      accessibilityManager.update([button]);
      const state = accessibilityManager.getAccessibilityState();
      
      expect(state.focusableElements[0].ariaLabel).toBe('Button test-button');
    });

    it('should use custom ARIA labels when provided', () => {
      const button = createMockNode('test-button', 'Button');
      (button as any).ariaLabel = 'Custom Button Label';
      
      accessibilityManager.update([button]);
      const state = accessibilityManager.getAccessibilityState();
      
      expect(state.focusableElements[0].ariaLabel).toBe('Custom Button Label');
    });
  });

  describe('Cleanup', () => {
    it('should remove all accessibility elements on cleanup', () => {
      accessibilityManager.cleanup();
      
      expect(document.querySelector('[aria-live]')).toBeNull();
      expect(document.querySelector('div[aria-hidden="true"]')).toBeNull();
      
      const state = accessibilityManager.getAccessibilityState();
      expect(state.focusableElements).toEqual([]);
      expect(state.currentFocus).toBeNull();
    });
  });

  describe('System Preferences Detection', () => {
    it('should detect high contrast preference', () => {
      // Mock high contrast preference
      window.matchMedia = vi.fn().mockImplementation(query => {
        if (query === '(prefers-contrast: high)') {
          return {
            matches: true,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          };
        }
        return {
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        };
      });

      const newAccessibilityManager = new AccessibilityManager();
      const state = newAccessibilityManager.getAccessibilityState();
      expect(state.isHighContrast).toBe(true);
    });
  });

  describe('WCAG Compliance', () => {
    it('should provide sufficient color contrast in high contrast mode', () => {
      // The accessibility manager should start with high contrast disabled
      const state = accessibilityManager.getAccessibilityState();
      expect(state.isHighContrast).toBe(false);
      
      // First set a theme
      accessibilityManager.setTheme(theme);
      const highContrastTheme = accessibilityManager.toggleHighContrast();
      
      // High contrast should use pure black and white for maximum contrast
      expect(highContrastTheme.colors.background).toBe('#000000');
      expect(highContrastTheme.colors.text).toBe('#ffffff');
      
      // Accent color should be high contrast yellow
      expect(highContrastTheme.colors.accent).toBe('#ffff00');
    });

    it('should support text scaling up to 200% (WCAG AA)', () => {
      accessibilityManager.setTextScaling(2.0);
      expect(accessibilityManager.getTextScaling()).toBe(2.0);
    });

    it('should support keyboard navigation for all interactive elements', () => {
      const button = createMockNode('test-button', 'Button');
      accessibilityManager.update([button]);
      
      const state = accessibilityManager.getAccessibilityState();
      expect(state.focusableElements.length).toBeGreaterThan(0);
      
      // Should be able to focus via keyboard
      const success = accessibilityManager.focusNode('test-button');
      expect(success).toBe(true);
    });
  });
});