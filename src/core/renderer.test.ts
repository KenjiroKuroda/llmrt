/**
 * Tests for the canvas rendering system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer, RenderModule, RenderContext } from './renderer.js';
import { NodeFactory } from './scene-tree.js';
import { ThemeTokens } from '../types/core.js';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(),
  style: {},
  parentElement: {
    getBoundingClientRect: () => ({ width: 800, height: 600 })
  }
} as any;

const mockContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  transform: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  set fillStyle(value: string) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set font(value: string) { this._font = value; },
  get font() { return this._font; },
  set textAlign(value: string) { this._textAlign = value; },
  get textAlign() { return this._textAlign; },
  set textBaseline(value: string) { this._textBaseline = value; },
  get textBaseline() { return this._textBaseline; },
  set globalAlpha(value: number) { this._globalAlpha = value; },
  get globalAlpha() { return this._globalAlpha; },
  _fillStyle: '#000000',
  _font: '16px Arial',
  _textAlign: 'start',
  _textBaseline: 'alphabetic',
  _globalAlpha: 1
};

const mockTheme: ThemeTokens = {
  colors: {
    primary: '#007acc',
    secondary: '#f0f0f0',
    background: '#ffffff',
    text: '#333333',
    accent: '#ff6b35'
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
    small: 4,
    medium: 8,
    large: 16
  }
};

// Mock window for responsive canvas
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1
});

window.addEventListener = vi.fn();

describe('Renderer', () => {
  let renderer: Renderer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas.getContext.mockReturnValue(mockContext);
    renderer = new Renderer(mockCanvas, mockTheme);
  });

  describe('constructor', () => {
    it('should initialize with canvas and theme', () => {
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false
      });
      expect(renderer).toBeDefined();
    });

    it('should throw error if canvas context is not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      expect(() => new Renderer(mockCanvas, mockTheme)).toThrow('Failed to get 2D rendering context');
    });

    it('should set up responsive canvas', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('render', () => {
    it('should clear canvas and fill background', () => {
      const nodes = [NodeFactory.createGroup('root')];
      
      renderer.render(nodes, 0);
      
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(mockContext.fillStyle).toBe(mockTheme.colors.background);
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should set up camera transform', () => {
      const nodes = [NodeFactory.createGroup('root')];
      
      renderer.render(nodes, 0);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.scale).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should skip invisible nodes', () => {
      const node = NodeFactory.createSprite('sprite');
      node.visible = false;
      
      renderer.render([node], 0);
      
      // Should only have background rendering calls
      expect(mockContext.save).toHaveBeenCalledTimes(1); // Only for camera setup
    });

    it('should render visible nodes', () => {
      const node = NodeFactory.createSprite('sprite');
      
      renderer.render([node], 0);
      
      expect(mockContext.save).toHaveBeenCalledTimes(2); // Camera + node
      expect(mockContext.restore).toHaveBeenCalledTimes(2);
    });
  });

  describe('core node rendering', () => {
    it('should render Group nodes (no visual output)', () => {
      const group = NodeFactory.createGroup('group');
      
      renderer.render([group], 0);
      
      // Group should not render anything itself
      expect(mockContext.fillRect).toHaveBeenCalledTimes(1); // Only background
    });

    it('should render Sprite nodes with placeholder', () => {
      const sprite = NodeFactory.createSprite('sprite');
      
      renderer.render([sprite], 0);
      
      expect(mockContext.fillStyle).toBe(mockTheme.colors.primary);
      expect(mockContext.fillRect).toHaveBeenCalledWith(-25, -25, 50, 50);
    });

    it('should render Text nodes', () => {
      const text = NodeFactory.createText('text', 'Hello World');
      
      renderer.render([text], 0);
      
      expect(mockContext.font).toBe(`${mockTheme.font.sizes.medium}px ${mockTheme.font.family}`);
      expect(mockContext.fillStyle).toBe(mockTheme.colors.text);
      expect(mockContext.textAlign).toBe('center');
      expect(mockContext.textBaseline).toBe('middle');
      expect(mockContext.fillText).toHaveBeenCalledWith('Hello World', 0, 0);
    });

    it('should render Button nodes with background and text', () => {
      const button = NodeFactory.createButton('button', 'Click Me');
      
      renderer.render([button], 0);
      
      // Should draw rounded rectangle background
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
      
      // Should draw text
      expect(mockContext.fillText).toHaveBeenCalledWith('Click Me', 0, 0);
    });

    it('should handle Camera2D nodes (no visual output)', () => {
      const camera = NodeFactory.createCamera2D('camera');
      
      renderer.render([camera], 0);
      
      // Camera should not render anything visual
      expect(mockContext.fillRect).toHaveBeenCalledTimes(1); // Only background
    });
  });

  describe('transform application', () => {
    it('should apply node transforms', () => {
      const node = NodeFactory.createSprite('sprite');
      node.transform.position = { x: 100, y: 50 };
      node.transform.rotation = Math.PI / 4;
      node.transform.scale = { x: 2, y: 1.5 };
      node.transform.alpha = 0.8;
      
      renderer.render([node], 0);
      
      expect(mockContext.translate).toHaveBeenCalledWith(100, 50);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 1.5);
      expect(mockContext.globalAlpha).toBe(0.8);
    });

    it('should apply skew transforms when present', () => {
      const node = NodeFactory.createSprite('sprite');
      node.transform.skew = { x: 0.1, y: 0.2 };
      
      renderer.render([node], 0);
      
      expect(mockContext.transform).toHaveBeenCalledWith(
        1, 
        Math.tan(0.2), 
        Math.tan(0.1), 
        1, 
        0, 
        0
      );
    });

    it('should skip completely transparent nodes', () => {
      const node = NodeFactory.createSprite('sprite');
      node.transform.alpha = 0;
      
      renderer.render([node], 0);
      
      // Should not render the node
      expect(mockContext.fillRect).toHaveBeenCalledTimes(1); // Only background
    });
  });

  describe('module system', () => {
    it('should register render modules', () => {
      const mockModule: RenderModule = {
        name: 'test-module',
        nodeTypes: ['TestNode'],
        render: vi.fn()
      };
      
      renderer.registerModule(mockModule);
      
      // Create a node with the custom type
      const node = NodeFactory.createGroup('test');
      (node as any).type = 'TestNode';
      
      renderer.render([node], 0);
      
      expect(mockModule.render).toHaveBeenCalled();
    });

    it('should warn about unsupported node types', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const node = NodeFactory.createGroup('test');
      (node as any).type = 'UnsupportedType';
      
      renderer.render([node], 0);
      
      expect(consoleSpy).toHaveBeenCalledWith('No renderer found for node type: UnsupportedType');
      
      consoleSpy.mockRestore();
    });
  });

  describe('theme system', () => {
    it('should update theme tokens', () => {
      const newTheme: ThemeTokens = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          background: '#000000'
        }
      };
      
      renderer.setTheme(newTheme);
      renderer.render([NodeFactory.createGroup('root')], 0);
      
      expect(mockContext.fillStyle).toBe('#000000');
    });

    it('should apply theme colors to rendered elements', () => {
      const text = NodeFactory.createText('text', 'Test');
      
      renderer.render([text], 0);
      
      expect(mockContext.fillStyle).toBe(mockTheme.colors.text);
    });

    it('should apply theme fonts to text elements', () => {
      const text = NodeFactory.createText('text', 'Test');
      
      renderer.render([text], 0);
      
      expect(mockContext.font).toBe(`${mockTheme.font.sizes.medium}px ${mockTheme.font.family}`);
    });
  });

  describe('camera system', () => {
    it('should update camera properties', () => {
      const newCamera = {
        position: { x: 100, y: 50 },
        zoom: 2,
        rotation: Math.PI / 4
      };
      
      renderer.setCamera(newCamera);
      
      const viewport = renderer.getViewport();
      expect(viewport).toBeDefined();
    });

    it('should convert screen to world coordinates', () => {
      const screenPos = { x: 400, y: 300 };
      const worldPos = renderer.screenToWorld(screenPos);
      
      expect(worldPos).toEqual({ x: 400, y: 300 });
    });

    it('should convert world to screen coordinates', () => {
      const worldPos = { x: 100, y: 50 };
      const screenPos = renderer.worldToScreen(worldPos);
      
      expect(screenPos).toEqual({ x: 100, y: 50 });
    });
  });

  describe('viewport system', () => {
    it('should return current viewport information', () => {
      const viewport = renderer.getViewport();
      
      expect(viewport).toEqual({
        width: 800,
        height: 600,
        scale: expect.any(Number),
        offset: expect.any(Object)
      });
    });

    it('should handle responsive scaling', () => {
      // Simulate container resize
      mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 400, height: 300 });
      
      // Trigger resize event
      const resizeHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'resize'
      )[1];
      resizeHandler();
      
      const viewport = renderer.getViewport();
      expect(viewport.scale).toBeLessThan(1); // Should scale down
    });
  });

  describe('hierarchical rendering', () => {
    it('should render child nodes', () => {
      const parent = NodeFactory.createGroup('parent');
      const child = NodeFactory.createSprite('child');
      parent.addChild(child);
      
      renderer.render([parent], 0);
      
      // Should render both parent and child
      expect(mockContext.save).toHaveBeenCalledTimes(3); // Camera + parent + child
      expect(mockContext.restore).toHaveBeenCalledTimes(3);
    });

    it('should skip invisible child nodes', () => {
      const parent = NodeFactory.createGroup('parent');
      const child = NodeFactory.createSprite('child');
      child.visible = false;
      parent.addChild(child);
      
      renderer.render([parent], 0);
      
      // Should only render parent
      expect(mockContext.save).toHaveBeenCalledTimes(2); // Camera + parent only
    });

    it('should apply world transforms to child nodes', () => {
      const parent = NodeFactory.createGroup('parent');
      parent.transform.position = { x: 50, y: 25 };
      parent.transform.scale = { x: 2, y: 2 };
      
      const child = NodeFactory.createSprite('child');
      child.transform.position = { x: 10, y: 5 };
      parent.addChild(child);
      
      renderer.render([parent], 0);
      
      // Child should be rendered with combined transform
      expect(mockContext.translate).toHaveBeenCalledWith(50, 25); // Parent
      expect(mockContext.translate).toHaveBeenCalledWith(70, 35); // Child world position
    });
  });
});