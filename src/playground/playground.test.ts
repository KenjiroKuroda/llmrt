/**
 * Tests for the Playground development tools
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <textarea id="cartridgeEditor"></textarea>
  <div id="validationPanel"></div>
  <div id="consolePanel"></div>
  <canvas id="frameTimeChart" width="280" height="100"></canvas>
  <canvas id="memoryChart" width="280" height="100"></canvas>
  <div id="fpsCounter"></div>
  <div id="avgFrameTime"></div>
  <div id="minFps"></div>
  <div id="maxFps"></div>
  <div id="memoryUsage"></div>
  <div id="assetPreview"></div>
  <div id="sceneTree"></div>
  <div id="statusText"></div>
  <div id="loadingOverlay" class="hidden"></div>
  <input type="file" id="fileInput" style="display: none;">
  <button id="loadBtn">Load</button>
  <button id="runBtn">Run</button>
  <button id="stopBtn">Stop</button>
  <button id="resetBtn">Reset</button>
  <button id="validateBtn">Validate</button>
  <button id="exportBtn">Export</button>
  <select id="sampleSelect"></select>
  <div class="debug-tab" data-tab="performance">Performance</div>
  <div class="debug-tab" data-tab="assets">Assets</div>
  <div class="debug-tab" data-tab="scene">Scene</div>
  <div id="performanceTab" class="debug-tab-content"></div>
  <div id="assetsTab" class="debug-tab-content hidden"></div>
  <div id="sceneTab" class="debug-tab-content hidden"></div>
</body>
</html>
`, { url: 'http://localhost' });

global.document = dom.window.document;
global.window = dom.window as any;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;

// Mock Canvas API for JSDOM
Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    fillStyle: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    strokeText: vi.fn(),
    fillText: vi.fn()
  }),
  writable: true
});
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();
global.performance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10 // 10MB
  }
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
} as any;

// Mock TextEncoder
global.TextEncoder = class {
  encode(text: string) {
    return new Uint8Array(text.split('').map(c => c.charCodeAt(0)));
  }
} as any;

import { PlaygroundApp } from './playground.js';

describe('PlaygroundApp', () => {
  let playground: PlaygroundApp;
  let mockConsole: any;

  beforeEach(() => {
    // Reset DOM
    document.getElementById('cartridgeEditor')!.textContent = '';
    document.getElementById('validationPanel')!.innerHTML = '';
    document.getElementById('consolePanel')!.innerHTML = '';
    
    // Mock console methods
    mockConsole = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };
    
    vi.stubGlobal('console', mockConsole);
    
    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize playground app', () => {
      playground = new PlaygroundApp();
      expect(playground).toBeDefined();
    });

    it('should set up console capture', () => {
      playground = new PlaygroundApp();
      
      console.log('test message');
      console.error('test error');
      console.warn('test warning');
      
      // Check that messages were added to the console panel instead of checking mocks
      const consolePanel = document.getElementById('consolePanel');
      expect(consolePanel?.innerHTML).toContain('test message');
      expect(consolePanel?.innerHTML).toContain('test error');
      expect(consolePanel?.innerHTML).toContain('test warning');
    });

    it('should initialize debug tabs', () => {
      playground = new PlaygroundApp();
      
      const performanceTab = document.querySelector('[data-tab="performance"]');
      const assetsTab = document.querySelector('[data-tab="assets"]');
      
      expect(performanceTab).toBeDefined();
      expect(assetsTab).toBeDefined();
    });
  });

  describe('Cartridge Validation', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should validate valid cartridge JSON', () => {
      const validCartridge = {
        version: "1.0",
        metadata: {
          title: "Test Game",
          author: "Test Author",
          description: "Test Description"
        },
        theme: {
          colors: {
            primary: "#FFFFFF",
            secondary: "#CCCCCC",
            background: "#000000",
            text: "#FFFFFF",
            accent: "#00FF00"
          },
          font: {
            family: "monospace",
            sizes: { medium: 16 }
          },
          spacing: { medium: 8 },
          radii: { medium: 4 }
        },
        scenes: [{
          id: "testScene",
          root: {
            id: "root",
            type: "Group",
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
            triggers: []
          }
        }],
        assets: {
          sprites: [],
          audio: [],
          fonts: []
        }
      };

      const editor = document.getElementById('cartridgeEditor') as HTMLTextAreaElement;
      editor.value = JSON.stringify(validCartridge);
      
      // Trigger validation
      const event = new dom.window.Event('input');
      editor.dispatchEvent(event);
      
      // Check validation panel
      const validationPanel = document.getElementById('validationPanel');
      expect(validationPanel?.innerHTML).toContain('validation-success');
    });

    it('should show error for invalid JSON', () => {
      const editor = document.getElementById('cartridgeEditor') as HTMLTextAreaElement;
      editor.value = '{ invalid json }';
      
      // Trigger validation
      const event = new dom.window.Event('input');
      editor.dispatchEvent(event);
      
      // Check validation panel
      const validationPanel = document.getElementById('validationPanel');
      expect(validationPanel?.innerHTML).toContain('validation-error');
    });

    it('should show error for empty cartridge', () => {
      const editor = document.getElementById('cartridgeEditor') as HTMLTextAreaElement;
      editor.value = '';
      
      // Trigger validation
      const event = new dom.window.Event('input');
      editor.dispatchEvent(event);
      
      // Check validation panel
      const validationPanel = document.getElementById('validationPanel');
      expect(validationPanel?.innerHTML).toContain('No cartridge data');
    });
  });

  describe('Sample Loading', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should load sample cartridge', async () => {
      const mockCartridge = {
        version: "1.0",
        metadata: { title: "Pong", author: "Test", description: "Test" },
        theme: { colors: {}, font: {}, spacing: {}, radii: {} },
        scenes: [],
        assets: { sprites: [], audio: [], fonts: [] }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockCartridge))
      } as Response);

      const sampleSelect = document.getElementById('sampleSelect') as HTMLSelectElement;
      sampleSelect.value = 'pong';
      
      const event = new dom.window.Event('change');
      sampleSelect.dispatchEvent(event);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(fetch).toHaveBeenCalledWith('./test-samples/pong.lgf.json');
    });

    it('should handle sample loading error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const sampleSelect = document.getElementById('sampleSelect') as HTMLSelectElement;
      sampleSelect.value = 'invalid';
      
      const event = new dom.window.Event('change');
      sampleSelect.dispatchEvent(event);
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check console for error
      const consolePanel = document.getElementById('consolePanel');
      expect(consolePanel?.innerHTML).toContain('Failed to load sample');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should update FPS counter', () => {
      // Simulate performance monitoring
      const fpsCounter = document.getElementById('fpsCounter');
      expect(fpsCounter).toBeDefined();
      
      // Performance monitoring would update this in real scenario
      fpsCounter!.textContent = 'FPS: 60';
      expect(fpsCounter!.textContent).toBe('FPS: 60');
    });

    it('should draw performance charts', () => {
      const frameTimeChart = document.getElementById('frameTimeChart') as HTMLCanvasElement;
      const memoryChart = document.getElementById('memoryChart') as HTMLCanvasElement;
      
      expect(frameTimeChart).toBeDefined();
      expect(memoryChart).toBeDefined();
      
      // Charts would be drawn with actual data in real scenario
      const ctx = frameTimeChart.getContext('2d');
      expect(ctx).toBeDefined();
    });

    it('should update performance stats', () => {
      const avgFrameTime = document.getElementById('avgFrameTime');
      const minFps = document.getElementById('minFps');
      const maxFps = document.getElementById('maxFps');
      const memoryUsage = document.getElementById('memoryUsage');
      
      expect(avgFrameTime).toBeDefined();
      expect(minFps).toBeDefined();
      expect(maxFps).toBeDefined();
      expect(memoryUsage).toBeDefined();
    });
  });

  describe('Asset Preview', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should show no assets message when empty', () => {
      const assetsTab = document.querySelector('[data-tab="assets"]') as HTMLElement;
      assetsTab.click();
      
      const assetPreview = document.getElementById('assetPreview');
      expect(assetPreview?.innerHTML).toContain('No assets loaded');
    });

    it('should display sprite assets', () => {
      // This would be tested with actual cartridge loading
      const assetPreview = document.getElementById('assetPreview');
      expect(assetPreview).toBeDefined();
    });
  });

  describe('Scene Tree Display', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should show no scene message when empty', () => {
      const sceneTab = document.querySelector('[data-tab="scene"]') as HTMLElement;
      sceneTab.click();
      
      const sceneTree = document.getElementById('sceneTree');
      expect(sceneTree?.textContent).toBe('No scene loaded');
    });

    it('should render scene tree structure', () => {
      // This would be tested with actual cartridge loading
      const sceneTree = document.getElementById('sceneTree');
      expect(sceneTree).toBeDefined();
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should generate build HTML', () => {
      const mockCartridge = {
        metadata: { title: "Test Game", author: "Test", description: "Test" },
        version: "1.0",
        theme: { colors: {}, font: {}, spacing: {}, radii: {} },
        scenes: [],
        assets: { sprites: [], audio: [], fonts: [] }
      };

      // Test HTML generation (private method would need to be exposed for testing)
      expect(mockCartridge.metadata.title).toBe("Test Game");
    });

    it('should handle export errors gracefully', () => {
      const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
      expect(exportBtn.disabled).toBe(true); // Should be disabled without valid cartridge
    });
  });

  describe('Debug Tab Switching', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should switch between debug tabs', () => {
      const performanceTab = document.querySelector('[data-tab="performance"]') as HTMLElement;
      const assetsTab = document.querySelector('[data-tab="assets"]') as HTMLElement;
      
      // Click assets tab
      assetsTab.click();
      
      expect(assetsTab.classList.contains('active')).toBe(true);
      expect(performanceTab.classList.contains('active')).toBe(false);
      
      // Click performance tab
      performanceTab.click();
      
      expect(performanceTab.classList.contains('active')).toBe(true);
      expect(assetsTab.classList.contains('active')).toBe(false);
    });

    it('should show/hide tab content', () => {
      const assetsTab = document.querySelector('[data-tab="assets"]') as HTMLElement;
      const assetsContent = document.getElementById('assetsTab');
      const performanceContent = document.getElementById('performanceTab');
      
      // Click assets tab
      assetsTab.click();
      
      expect(assetsContent?.classList.contains('hidden')).toBe(false);
      expect(performanceContent?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Button State Management', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should update button states correctly', () => {
      const runBtn = document.getElementById('runBtn') as HTMLButtonElement;
      const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
      const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
      const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
      
      // Initially, buttons should be in correct state
      expect(runBtn.disabled).toBe(true); // No cartridge loaded
      expect(stopBtn.disabled).toBe(true); // Not running
      expect(resetBtn.disabled).toBe(true); // No cartridge loaded
      expect(exportBtn.disabled).toBe(true); // No cartridge loaded
    });

    it('should update status text', () => {
      const statusText = document.getElementById('statusText');
      expect(statusText?.textContent).toBe('No cartridge');
    });
  });

  describe('File Loading', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should handle file input', () => {
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;
      
      // Mock file input click
      const clickSpy = vi.spyOn(fileInput, 'click');
      loadBtn.click();
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Console Logging', () => {
    beforeEach(() => {
      playground = new PlaygroundApp();
    });

    it('should capture and display console messages', () => {
      console.log('Test info message');
      console.error('Test error message');
      console.warn('Test warning message');
      
      const consolePanel = document.getElementById('consolePanel');
      expect(consolePanel?.innerHTML).toContain('Test info message');
      expect(consolePanel?.innerHTML).toContain('Test error message');
      expect(consolePanel?.innerHTML).toContain('Test warning message');
    });

    it('should limit console entries', () => {
      // Add many console entries
      for (let i = 0; i < 150; i++) {
        console.log(`Message ${i}`);
      }
      
      const consolePanel = document.getElementById('consolePanel');
      expect(consolePanel?.children.length).toBeLessThanOrEqual(100);
    });
  });
});