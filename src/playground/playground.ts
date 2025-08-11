/**
 * LLM Canvas Engine Playground
 * Interactive development environment for testing and debugging cartridges
 */

import { LLMRTEngine, createEngine } from '../index.js';
import { validateCartridge } from '../core/validator.js';
import type { LGFCartridge, ValidationResult } from '../types/index.js';
import { PerformanceProfiler } from './performance-profiler.js';
import { AssetPreviewManager } from './asset-preview.js';
import { BuildExporter, type BuildConfig } from './build-exporter.js';

interface PerformanceMetrics {
  frameTime: number;
  fps: number;
  memoryUsage: number;
  timestamp: number;
}

interface AssetInfo {
  id: string;
  type: 'sprite' | 'audio' | 'font';
  url: string;
  loaded: boolean;
  error?: string;
}

export class PlaygroundApp {
  private engine: LLMRTEngine | null = null;
  private canvas: HTMLCanvasElement;
  private editor: HTMLTextAreaElement;
  private validationPanel: HTMLElement;
  private consolePanel: HTMLElement;
  private performanceMetrics: PerformanceMetrics[] = [];
  private frameTimeChart: HTMLCanvasElement;
  private memoryChart: HTMLCanvasElement;
  private isRunning = false;
  private currentCartridge: LGFCartridge | null = null;
  private assets: AssetInfo[] = [];
  private performanceMonitorId: number | null = null;
  private profiler: PerformanceProfiler;
  private assetManager: AssetPreviewManager;
  private buildExporter: BuildExporter;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.editor = document.getElementById('cartridgeEditor') as HTMLTextAreaElement;
    this.validationPanel = document.getElementById('validationPanel') as HTMLElement;
    this.consolePanel = document.getElementById('consolePanel') as HTMLElement;
    this.frameTimeChart = document.getElementById('frameTimeChart') as HTMLCanvasElement;
    this.memoryChart = document.getElementById('memoryChart') as HTMLCanvasElement;

    // Initialize utilities
    this.profiler = new PerformanceProfiler();
    this.assetManager = new AssetPreviewManager();
    this.buildExporter = new BuildExporter();

    this.initializeEventListeners();
    this.initializeDebugTabs();
    this.setupConsoleCapture();
    this.log('Playground initialized', 'info');
  }

  private initializeEventListeners(): void {
    // Toolbar buttons
    document.getElementById('loadBtn')?.addEventListener('click', () => this.loadCartridge());
    document.getElementById('runBtn')?.addEventListener('click', () => this.runCartridge());
    document.getElementById('stopBtn')?.addEventListener('click', () => this.stopCartridge());
    document.getElementById('resetBtn')?.addEventListener('click', () => this.resetCartridge());
    document.getElementById('validateBtn')?.addEventListener('click', () => this.validateCurrentCartridge());
    document.getElementById('exportBtn')?.addEventListener('click', () => this.exportBuild());

    // Sample selector
    const sampleSelect = document.getElementById('sampleSelect') as HTMLSelectElement;
    sampleSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value) {
        this.loadSample(target.value);
        target.value = '';
      }
    });

    // File input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.addEventListener('change', (e) => this.handleFileLoad(e));

    // Editor changes
    this.editor.addEventListener('input', () => {
      this.debounce(() => this.validateCurrentCartridge().catch(console.error), 500);
    });

    // Canvas resize
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  private initializeDebugTabs(): void {
    const tabs = document.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchDebugTab(tabName);
        }
      });
    });
  }

  private switchDebugTab(tabName: string): void {
    // Update tab appearance
    document.querySelectorAll('.debug-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Show/hide content
    document.querySelectorAll('.debug-tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`)?.classList.remove('hidden');

    // Update content based on tab
    switch (tabName) {
      case 'assets':
        this.updateAssetPreview();
        break;
      case 'scene':
        this.updateSceneTree();
        break;
    }
  }

  private setupConsoleCapture(): void {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog.apply(console, args);
      this.log(args.join(' '), 'info');
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      this.log(args.join(' '), 'error');
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.log(args.join(' '), 'warn');
    };
  }

  private log(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    const entry = document.createElement('div');
    entry.className = `console-entry console-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.consolePanel.appendChild(entry);
    this.consolePanel.scrollTop = this.consolePanel.scrollHeight;

    // Keep only last 100 entries
    while (this.consolePanel.children.length > 100) {
      this.consolePanel.removeChild(this.consolePanel.firstChild!);
    }
  }

  private async loadCartridge(): Promise<void> {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput.click();
  }

  private async handleFileLoad(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      this.editor.value = text;
      this.validateCurrentCartridge();
      this.log(`Loaded cartridge: ${file.name}`, 'info');
    } catch (error) {
      this.log(`Failed to load file: ${error}`, 'error');
    }
  }

  private async loadSample(sampleName: string): Promise<void> {
    try {
      const response = await fetch(`./test-samples/${sampleName}.lgf.json`);
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${response.statusText}`);
      }
      const text = await response.text();
      this.editor.value = text;
      this.validateCurrentCartridge();
      this.log(`Loaded sample: ${sampleName}`, 'info');
    } catch (error) {
      this.log(`Failed to load sample: ${error}`, 'error');
    }
  }

  private async validateCurrentCartridge(): Promise<void> {
    const text = this.editor.value.trim();
    if (!text) {
      this.showValidationResult({ valid: false, errors: [{ path: '', message: 'No cartridge data', code: 'EMPTY_CARTRIDGE' }], warnings: [] });
      return;
    }

    try {
      const cartridge = JSON.parse(text) as LGFCartridge;
      const result = validateCartridge(cartridge);
      this.showValidationResult(result);
      
      if (result.valid) {
        this.currentCartridge = cartridge;
        this.extractAssets(cartridge);
        await this.assetManager.loadCartridgeAssets(cartridge);
        this.updateButtons();
      } else {
        this.currentCartridge = null;
        this.updateButtons();
      }
    } catch (error) {
      this.showValidationResult({
        valid: false,
        errors: [{ path: 'JSON', message: `Parse error: ${error}`, code: 'JSON_PARSE_ERROR' }],
        warnings: []
      });
      this.currentCartridge = null;
      this.updateButtons();
    }
  }

  private showValidationResult(result: ValidationResult): void {
    this.validationPanel.innerHTML = '';

    if (result.valid) {
      const success = document.createElement('div');
      success.className = 'validation-success';
      success.textContent = '✓ Cartridge is valid';
      this.validationPanel.appendChild(success);
    }

    result.errors.forEach(error => {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'validation-error';
      errorDiv.innerHTML = `<strong>${error.path || 'Error'}:</strong> ${error.message}`;
      this.validationPanel.appendChild(errorDiv);
    });

    result.warnings.forEach(warning => {
      const warningDiv = document.createElement('div');
      warningDiv.className = 'validation-warning';
      warningDiv.innerHTML = `<strong>${warning.path || 'Warning'}:</strong> ${warning.message}`;
      this.validationPanel.appendChild(warningDiv);
    });
  }

  private extractAssets(cartridge: LGFCartridge): void {
    this.assets = [];

    cartridge.assets.sprites.forEach(sprite => {
      this.assets.push({
        id: sprite.id,
        type: 'sprite',
        url: sprite.url,
        loaded: false
      });
    });

    cartridge.assets.audio.forEach(audio => {
      this.assets.push({
        id: audio.id,
        type: 'audio',
        url: audio.url,
        loaded: false
      });
    });

    cartridge.assets.fonts.forEach(font => {
      this.assets.push({
        id: font.id,
        type: 'font',
        url: font.url,
        loaded: false
      });
    });
  }

  private async runCartridge(): Promise<void> {
    if (!this.currentCartridge) {
      this.log('No valid cartridge to run', 'error');
      return;
    }

    try {
      this.showLoading(true);
      this.log('Starting cartridge...', 'info');

      // Create new engine instance
      this.engine = createEngine();
      
      // Load cartridge
      await this.engine.loadCartridge(this.currentCartridge);
      
      // Start engine
      this.engine.start();
      this.isRunning = true;
      
      this.updateButtons();
      this.startPerformanceMonitoring();
      this.log('Cartridge started successfully', 'info');
      
    } catch (error) {
      this.log(`Failed to run cartridge: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  private stopCartridge(): void {
    if (this.engine) {
      this.engine.stop();
      this.engine = null;
    }
    this.isRunning = false;
    this.stopPerformanceMonitoring();
    this.updateButtons();
    this.log('Cartridge stopped', 'info');
  }

  private resetCartridge(): void {
    this.stopCartridge();
    this.performanceMetrics = [];
    this.clearPerformanceCharts();
    this.log('Cartridge reset', 'info');
  }

  private startPerformanceMonitoring(): void {
    if (this.performanceMonitorId) return;

    this.profiler.startRecording();
    
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsSum = 0;
    let minFps = Infinity;
    let maxFps = 0;

    const monitor = () => {
      if (!this.isRunning) return;

      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      const fps = 1000 / frameTime;

      frameCount++;
      fpsSum += fps;
      minFps = Math.min(minFps, fps);
      maxFps = Math.max(maxFps, fps);

      // Record profiler metrics
      this.profiler.recordFrame(frameTime);
      this.profiler.recordMemoryUsage();

      // Update FPS counter
      const fpsCounter = document.getElementById('fpsCounter');
      if (fpsCounter) {
        fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
      }

      // Store metrics
      this.performanceMetrics.push({
        frameTime,
        fps,
        memoryUsage: this.getMemoryUsage(),
        timestamp: currentTime
      });

      // Keep only last 300 samples (5 seconds at 60fps)
      if (this.performanceMetrics.length > 300) {
        this.performanceMetrics.shift();
      }

      // Update charts every 10 frames
      if (frameCount % 10 === 0) {
        this.updatePerformanceCharts();
        this.updatePerformanceStats(fpsSum / frameCount, minFps, maxFps);
      }

      lastTime = currentTime;
      this.performanceMonitorId = requestAnimationFrame(monitor);
    };

    this.performanceMonitorId = requestAnimationFrame(monitor);
  }

  private stopPerformanceMonitoring(): void {
    if (this.performanceMonitorId) {
      cancelAnimationFrame(this.performanceMonitorId);
      this.performanceMonitorId = null;
    }
    
    if (this.profiler) {
      const report = this.profiler.stopRecording();
      this.log(`Performance Report - Score: ${report.performanceScore}/100, Avg FPS: ${report.averageFps.toFixed(1)}`, 'info');
    }
  }

  private getMemoryUsage(): number {
    // Estimate memory usage (not precise but gives an indication)
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  private updatePerformanceCharts(): void {
    this.drawFrameTimeChart();
    this.drawMemoryChart();
  }

  private drawFrameTimeChart(): void {
    const ctx = this.frameTimeChart.getContext('2d');
    if (!ctx || this.performanceMetrics.length === 0) return;

    const width = this.frameTimeChart.width;
    const height = this.frameTimeChart.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#252526';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#3e3e42';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw frame time line
    if (this.performanceMetrics.length > 1) {
      ctx.strokeStyle = '#89d185';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const maxFrameTime = Math.max(...this.performanceMetrics.map(m => m.frameTime));
      const minFrameTime = Math.min(...this.performanceMetrics.map(m => m.frameTime));
      const range = Math.max(maxFrameTime - minFrameTime, 1);

      this.performanceMetrics.forEach((metric, index) => {
        const x = (index / (this.performanceMetrics.length - 1)) * width;
        const y = height - ((metric.frameTime - minFrameTime) / range) * height;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw 16.67ms line (60fps target)
    ctx.strokeStyle = '#ffcc02';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const targetY = height * 0.3; // Approximate position for 16.67ms
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawMemoryChart(): void {
    const ctx = this.memoryChart.getContext('2d');
    if (!ctx || this.performanceMetrics.length === 0) return;

    const width = this.memoryChart.width;
    const height = this.memoryChart.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#252526';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#3e3e42';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw memory usage line
    if (this.performanceMetrics.length > 1) {
      ctx.strokeStyle = '#75beff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const memoryValues = this.performanceMetrics.map(m => m.memoryUsage).filter(m => m > 0);
      if (memoryValues.length > 0) {
        const maxMemory = Math.max(...memoryValues);
        const minMemory = Math.min(...memoryValues);
        const range = Math.max(maxMemory - minMemory, 1);

        this.performanceMetrics.forEach((metric, index) => {
          if (metric.memoryUsage > 0) {
            const x = (index / (this.performanceMetrics.length - 1)) * width;
            const y = height - ((metric.memoryUsage - minMemory) / range) * height;
            
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        });

        ctx.stroke();
      }
    }
  }

  private updatePerformanceStats(avgFps: number, minFps: number, maxFps: number): void {
    const avgFrameTime = 1000 / avgFps;
    const currentMemory = this.performanceMetrics.length > 0 ? 
      this.performanceMetrics[this.performanceMetrics.length - 1].memoryUsage : 0;

    document.getElementById('avgFrameTime')!.textContent = avgFrameTime.toFixed(2);
    document.getElementById('minFps')!.textContent = Math.round(minFps).toString();
    document.getElementById('maxFps')!.textContent = Math.round(maxFps).toString();
    document.getElementById('memoryUsage')!.textContent = currentMemory.toFixed(1);
  }

  private clearPerformanceCharts(): void {
    const frameCtx = this.frameTimeChart.getContext('2d');
    const memoryCtx = this.memoryChart.getContext('2d');
    
    if (frameCtx) {
      frameCtx.clearRect(0, 0, this.frameTimeChart.width, this.frameTimeChart.height);
    }
    if (memoryCtx) {
      memoryCtx.clearRect(0, 0, this.memoryChart.width, this.memoryChart.height);
    }

    // Reset stats
    document.getElementById('avgFrameTime')!.textContent = '--';
    document.getElementById('minFps')!.textContent = '--';
    document.getElementById('maxFps')!.textContent = '--';
    document.getElementById('memoryUsage')!.textContent = '--';
  }

  private updateAssetPreview(): void {
    const assetPreview = document.getElementById('assetPreview');
    if (!assetPreview) return;

    assetPreview.innerHTML = '';

    const assets = this.assetManager.getAllAssets();
    if (assets.length === 0) {
      const noAssets = document.createElement('div');
      noAssets.className = 'asset-item';
      noAssets.textContent = 'No assets loaded';
      assetPreview.appendChild(noAssets);
      return;
    }

    assets.forEach(asset => {
      const previewElement = this.assetManager.createPreviewElement(asset.id);
      if (previewElement) {
        assetPreview.appendChild(previewElement);
      }
    });

    // Show asset statistics
    const stats = this.assetManager.getLoadingStats();
    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = 'grid-column: 1 / -1; padding: 8px; font-size: 11px; color: #888; border-top: 1px solid #3e3e42; margin-top: 8px;';
    statsDiv.innerHTML = `
      Assets: ${stats.loaded}/${stats.total} loaded
      ${stats.failed > 0 ? `<span style="color: #f14c4c;">${stats.failed} failed</span>` : ''}
      Avg load time: ${stats.averageLoadTime.toFixed(1)}ms
    `;
    assetPreview.appendChild(statsDiv);
  }

  private updateSceneTree(): void {
    const sceneTree = document.getElementById('sceneTree');
    if (!sceneTree) return;

    if (!this.currentCartridge) {
      sceneTree.textContent = 'No scene loaded';
      return;
    }

    sceneTree.innerHTML = '';
    
    this.currentCartridge.scenes.forEach(scene => {
      const sceneDiv = document.createElement('div');
      sceneDiv.innerHTML = `<strong>Scene: ${scene.id}</strong>`;
      sceneTree.appendChild(sceneDiv);
      
      const treeDiv = document.createElement('div');
      treeDiv.style.marginLeft = '16px';
      treeDiv.innerHTML = this.renderNodeTree(scene.root, 0);
      sceneTree.appendChild(treeDiv);
    });
  }

  private renderNodeTree(node: any, depth: number): string {
    const indent = '  '.repeat(depth);
    let html = `${indent}├─ ${node.id} (${node.type})<br>`;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any, index: number) => {
        html += this.renderNodeTree(child, depth + 1);
      });
    }
    
    return html;
  }

  private async exportBuild(): Promise<void> {
    if (!this.currentCartridge) {
      this.log('No cartridge to export', 'error');
      return;
    }

    try {
      this.showLoading(true);
      this.log('Generating build...', 'info');

      // Create build configuration
      const buildConfig = this.buildExporter.getDefaultConfig('web');
      buildConfig.cartridge = this.currentCartridge;

      // Generate build
      const result = await this.buildExporter.exportBuild(buildConfig);
      
      if (!result.success) {
        result.errors.forEach(error => this.log(error, 'error'));
        return;
      }

      // Show build results
      result.warnings.forEach(warning => this.log(warning, 'warn'));
      result.optimizations.forEach(opt => this.log(opt, 'info'));
      
      // Create zip file
      const zip = await this.buildExporter.createZipFile(result.files);
      
      // Download zip
      const blob = new Blob([zip as any], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentCartridge.metadata.title.replace(/\s+/g, '-').toLowerCase()}-build.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.log(`Build exported successfully (${(result.size / 1024).toFixed(1)} KB, ${result.buildTime.toFixed(0)}ms)`, 'info');
    } catch (error) {
      this.log(`Export failed: ${error}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }



  private updateButtons(): void {
    const runBtn = document.getElementById('runBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

    runBtn.disabled = !this.currentCartridge || this.isRunning;
    stopBtn.disabled = !this.isRunning;
    resetBtn.disabled = !this.currentCartridge;
    exportBtn.disabled = !this.currentCartridge;

    const statusText = document.getElementById('statusText');
    if (statusText) {
      if (this.isRunning) {
        statusText.textContent = 'Running';
      } else if (this.currentCartridge) {
        statusText.textContent = 'Ready';
      } else {
        statusText.textContent = 'No cartridge';
      }
    }
  }

  private showLoading(show: boolean): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }

  private resizeCanvas(): void {
    // Keep canvas at fixed size for now
    // Could implement responsive sizing here
  }

  private debounce(func: Function, wait: number): void {
    clearTimeout((this as any).debounceTimer);
    (this as any).debounceTimer = setTimeout(func, wait);
  }
}

// Initialize playground when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PlaygroundApp();
});