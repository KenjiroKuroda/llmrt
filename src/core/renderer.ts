/**
 * Optimized canvas rendering system for the LLM Canvas Engine
 */

import { Node, ThemeTokens, Vector2, Transform2D } from '../types/core.js';
import { RenderModule, RenderContext, Camera2D, Viewport } from '../types/modules.js';
import { ModuleRegistry } from './module-registry.js';
import { PerformanceMonitor, QualitySettings } from './performance-monitor.js';
import { MemoryManager } from './memory-manager.js';
import { AccessibilityManager } from './accessibility-manager.js';

export interface RenderStats {
  drawCalls: number;
  triangles: number;
  sprites: number;
  renderTime: number;
  culledNodes: number;
  batchedSprites: number;
}

/**
 * Optimized canvas renderer with performance monitoring and quality adjustment
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas?: HTMLCanvasElement;
  private offscreenCtx?: CanvasRenderingContext2D;
  private theme: ThemeTokens;
  private camera: Camera2D;
  private viewport: Viewport;
  private modules = new Map<string, RenderModule>();
  private nodeTypeToModule = new Map<string, RenderModule>();
  private performanceMonitor?: PerformanceMonitor;
  private memoryManager?: MemoryManager;
  private accessibilityManager?: AccessibilityManager;
  private qualitySettings: QualitySettings = {
    renderScale: 1.0,
    particleDensity: 1.0,
    shadowQuality: 'medium',
    textureFiltering: true,
    postProcessing: true,
    audioQuality: 'high',
    maxActiveAudioSources: 8
  };
  private renderStats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    sprites: 0,
    renderTime: 0,
    culledNodes: 0,
    batchedSprites: 0
  };
  private spriteBatch: any[] = [];
  private maxBatchSize = 100;
  private enableFrustumCulling = true;
  private enableSpriteBatching = true;

  constructor(canvas: HTMLCanvasElement, theme: ThemeTokens) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', {
      alpha: false, // Opaque canvas for better performance
      desynchronized: true, // Allow async rendering
      willReadFrequently: false // Optimize for write-only
    });
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.theme = theme;
    
    // Initialize camera
    this.camera = {
      position: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      target: { x: 0, y: 0 }
    };

    // Initialize viewport
    this.viewport = {
      width: canvas.width,
      height: canvas.height,
      scale: 1,
      offset: { x: 0, y: 0 }
    };

    // Setup optimization features
    this.setupOffscreenCanvas();
    this.optimizeCanvasSettings();
    this.detectPlatformOptimizations();

    // Register core node type renderers
    this.registerCoreRenderers();
    
    // Load any registered render modules from the module registry
    this.loadRegisteredModules();
    
    // Set up responsive canvas
    this.setupResponsiveCanvas();
  }

  /**
   * Main render method - renders scene tree with interpolation and optimizations
   */
  render(sceneTree: Node[], interpolation: number): void {
    const startTime = performance.now();
    
    // Reset render stats
    this.renderStats = {
      drawCalls: 0,
      triangles: 0,
      sprites: 0,
      renderTime: 0,
      culledNodes: 0,
      batchedSprites: 0
    };

    // Choose rendering context based on quality settings
    const renderCtx = this.qualitySettings.renderScale < 1.0 && this.offscreenCtx 
      ? this.offscreenCtx 
      : this.ctx;
    const renderCanvas = this.qualitySettings.renderScale < 1.0 && this.offscreenCanvas 
      ? this.offscreenCanvas 
      : this.canvas;

    // Clear canvas
    renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
    this.renderStats.drawCalls++;
    
    // Fill background
    renderCtx.fillStyle = this.theme.colors.background;
    renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
    this.renderStats.drawCalls++;

    // Set up camera transform
    this.setupCameraTransform(interpolation, renderCtx);

    // Create render context
    const context: RenderContext = {
      canvas: renderCanvas,
      ctx: renderCtx,
      camera: this.camera,
      theme: this.theme,
      interpolation,
      viewport: this.viewport
    };

    // Cull and batch nodes for optimized rendering
    const visibleNodes = this.cullNodes(sceneTree);
    
    // Render with batching optimizations
    this.renderOptimized(visibleNodes, context);

    // Copy from offscreen canvas if using scaled rendering
    if (renderCtx !== this.ctx && this.offscreenCanvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(
        this.offscreenCanvas, 
        0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height,
        0, 0, this.canvas.width, this.canvas.height
      );
      this.renderStats.drawCalls++;
    }

    // Reset transform
    renderCtx.restore();

    // Update render stats
    this.renderStats.renderTime = performance.now() - startTime;
    
    // Report to performance monitor
    if (this.performanceMonitor) {
      this.performanceMonitor.updateMetrics(
        this.renderStats.renderTime,
        this.getMemoryUsage(),
        this.renderStats.sprites,
        this.renderStats.drawCalls
      );
    }
  }

  /**
   * Register a render module for custom node types
   */
  registerModule(module: RenderModule): void {
    this.modules.set(module.name, module);
    
    // Map node types to this module
    for (const nodeType of module.nodeTypes) {
      this.nodeTypeToModule.set(nodeType, module);
    }

    // Also register with the module registry
    ModuleRegistry.getInstance().registerRenderModule(module);
  }

  /**
   * Update theme tokens
   */
  setTheme(theme: ThemeTokens): void {
    this.theme = theme;
    
    // Update accessibility manager with new theme
    if (this.accessibilityManager) {
      this.accessibilityManager.setTheme(theme);
    }
  }

  /**
   * Update camera properties
   */
  setCamera(camera: Partial<Camera2D>): void {
    Object.assign(this.camera, camera);
  }

  /**
   * Get current viewport information
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPos: Vector2): Vector2 {
    const worldX = (screenPos.x - this.viewport.offset.x) / this.camera.zoom + this.camera.position.x;
    const worldY = (screenPos.y - this.viewport.offset.y) / this.camera.zoom + this.camera.position.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPos: Vector2): Vector2 {
    const screenX = (worldPos.x - this.camera.position.x) * this.camera.zoom + this.viewport.offset.x;
    const screenY = (worldPos.y - this.camera.position.y) * this.camera.zoom + this.viewport.offset.y;
    return { x: screenX, y: screenY };
  }

  private setupCameraTransform(interpolation: number): void {
    this.ctx.save();
    
    // Apply viewport scaling and centering
    this.ctx.translate(this.viewport.offset.x, this.viewport.offset.y);
    this.ctx.scale(this.viewport.scale, this.viewport.scale);
    
    // Apply camera transform
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.rotate(this.camera.rotation);
    this.ctx.translate(-this.camera.position.x, -this.camera.position.y);
  }

  private renderNode(node: Node, context: RenderContext): void {
    // Get interpolated world transform
    const worldTransform = this.getInterpolatedWorldTransform(node, context.interpolation);
    
    // Skip if completely transparent
    if (worldTransform.alpha <= 0) {
      return;
    }

    // Save context state
    context.ctx.save();

    // Apply node transform
    this.applyTransform(context.ctx, worldTransform);

    // Render based on node type
    const module = this.nodeTypeToModule.get(node.type);
    if (module) {
      module.render(node, context);
    } else {
      console.warn(`No renderer found for node type: ${node.type}`);
    }

    // Render children
    for (const child of node.children) {
      if (child.visible) {
        this.renderNode(child, context);
      }
    }

    // Restore context state
    context.ctx.restore();
  }

  private getInterpolatedWorldTransform(node: Node, interpolation: number): Transform2D {
    // For now, return current world transform
    // In a full implementation, this would interpolate between previous and current transforms
    return node.getWorldTransform();
  }

  private applyTransform(ctx: CanvasRenderingContext2D, transform: Transform2D): void {
    ctx.translate(transform.position.x, transform.position.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scale.x, transform.scale.y);
    
    // Apply skew if present
    if (transform.skew.x !== 0 || transform.skew.y !== 0) {
      ctx.transform(1, Math.tan(transform.skew.y), Math.tan(transform.skew.x), 1, 0, 0);
    }
    
    ctx.globalAlpha *= transform.alpha;
  }

  private registerCoreRenderers(): void {
    // Register core node type renderers
    const coreRenderer: RenderModule = {
      name: 'core',
      nodeTypes: ['Group', 'Sprite', 'Text', 'Button', 'Camera2D'],
      render: (node: Node, context: RenderContext) => {
        this.renderCoreNode(node, context);
      }
    };

    this.registerModule(coreRenderer);
  }

  private renderCoreNode(node: Node, context: RenderContext): void {
    switch (node.type) {
      case 'Group':
        // Groups don't render anything themselves, just their children
        break;
        
      case 'Sprite':
        this.renderSprite(node, context);
        break;
        
      case 'Text':
        this.renderText(node, context);
        break;
        
      case 'Button':
        this.renderButton(node, context);
        break;
        
      case 'Camera2D':
        // Camera nodes don't render visually
        break;
        
      default:
        console.warn(`Core renderer doesn't handle node type: ${node.type}`);
    }
  }

  private renderSprite(node: Node, context: RenderContext): void {
    const spriteId = (node as any).spriteId;
    if (!spriteId) {
      // Render placeholder rectangle
      context.ctx.fillStyle = context.theme.colors.primary;
      context.ctx.fillRect(-25, -25, 50, 50);
      return;
    }

    // TODO: Load and render actual sprite image
    // For now, render a colored rectangle as placeholder
    context.ctx.fillStyle = context.theme.colors.primary;
    context.ctx.fillRect(-25, -25, 50, 50);
  }

  private renderText(node: Node, context: RenderContext): void {
    const text = (node as any).text || 'Text';
    let fontSize = (node as any).fontSize || context.theme.font.sizes.medium || 16;
    
    // Apply accessibility text scaling
    if (this.accessibilityManager) {
      fontSize = Math.round(fontSize * this.accessibilityManager.getTextScaling());
    }
    
    context.ctx.font = `${fontSize}px ${context.theme.font.family}`;
    context.ctx.fillStyle = context.theme.colors.text;
    context.ctx.textAlign = 'center';
    context.ctx.textBaseline = 'middle';
    
    context.ctx.fillText(text, 0, 0);
  }

  private renderButton(node: Node, context: RenderContext): void {
    const text = (node as any).text || 'Button';
    let fontSize = (node as any).fontSize || context.theme.font.sizes.medium || 16;
    const padding = context.theme.spacing.medium || 8;
    
    // Apply accessibility text scaling
    if (this.accessibilityManager) {
      fontSize = Math.round(fontSize * this.accessibilityManager.getTextScaling());
    }
    
    // Check if this button is currently focused
    const isFocused = this.accessibilityManager?.getCurrentFocus()?.id === node.id;
    
    // Measure text
    context.ctx.font = `${fontSize}px ${context.theme.font.family}`;
    const textMetrics = context.ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    // Calculate button dimensions (ensure minimum 44px for accessibility)
    const minSize = 44;
    const buttonWidth = Math.max(textWidth + padding * 2, minSize);
    const buttonHeight = Math.max(textHeight + padding * 2, minSize);
    
    // Draw button background
    context.ctx.fillStyle = isFocused ? context.theme.colors.accent : context.theme.colors.secondary;
    const radius = context.theme.radii.small || 4;
    this.drawRoundedRect(context.ctx, -buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, radius);
    
    // Draw focus indicator if focused
    if (isFocused) {
      context.ctx.strokeStyle = context.theme.colors.primary;
      context.ctx.lineWidth = 2;
      context.ctx.setLineDash([4, 2]);
      this.strokeRoundedRect(context.ctx, -buttonWidth/2 - 2, -buttonHeight/2 - 2, buttonWidth + 4, buttonHeight + 4, radius + 2);
      context.ctx.setLineDash([]);
    }
    
    // Draw button text
    context.ctx.fillStyle = context.theme.colors.text;
    context.ctx.textAlign = 'center';
    context.ctx.textBaseline = 'middle';
    context.ctx.fillText(text, 0, 0);
  }

  private drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  private strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
  }

  private loadRegisteredModules(): void {
    const moduleRegistry = ModuleRegistry.getInstance();
    const registeredModules = moduleRegistry.getRegisteredModules();
    
    for (const moduleDefinition of registeredModules) {
      const renderModule = moduleRegistry.getRenderModule(moduleDefinition.name);
      if (renderModule) {
        this.modules.set(renderModule.name, renderModule);
        
        // Map node types to this module
        for (const nodeType of renderModule.nodeTypes) {
          this.nodeTypeToModule.set(nodeType, renderModule);
        }
      }
    }
  }

  private setupResponsiveCanvas(): void {
    const updateViewport = () => {
      const container = this.canvas.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // Calculate scale to fit container while maintaining aspect ratio
      const canvasAspect = this.canvas.width / this.canvas.height;
      const containerAspect = containerRect.width / containerRect.height;
      
      let scale: number;
      if (canvasAspect > containerAspect) {
        // Canvas is wider - fit to width
        scale = containerRect.width / this.canvas.width;
      } else {
        // Canvas is taller - fit to height
        scale = containerRect.height / this.canvas.height;
      }

      // Update viewport
      this.viewport = {
        width: this.canvas.width,
        height: this.canvas.height,
        scale: scale * devicePixelRatio,
        offset: {
          x: (containerRect.width - this.canvas.width * scale) / 2,
          y: (containerRect.height - this.canvas.height * scale) / 2
        }
      };

      // Update canvas display size
      this.canvas.style.width = `${this.canvas.width * scale}px`;
      this.canvas.style.height = `${this.canvas.height * scale}px`;
    };

    // Update on resize
    window.addEventListener('resize', updateViewport);
    updateViewport();
  }

  // Performance optimization methods

  private setupOffscreenCanvas(): void {
    try {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.canvas.width;
      this.offscreenCanvas.height = this.canvas.height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false
      });
    } catch (error) {
      console.warn('Offscreen canvas not available:', error);
    }
  }

  private optimizeCanvasSettings(): void {
    // Disable image smoothing for pixel-perfect rendering when needed
    this.ctx.imageSmoothingEnabled = this.qualitySettings.textureFiltering;
    if (this.offscreenCtx) {
      this.offscreenCtx.imageSmoothingEnabled = this.qualitySettings.textureFiltering;
    }

    // Set optimal composite operation
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private detectPlatformOptimizations(): void {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = this.detectLowEndDevice();

    if (isMobile || isLowEnd) {
      this.qualitySettings.renderScale = 0.8;
      this.qualitySettings.particleDensity = 0.7;
      this.qualitySettings.textureFiltering = false;
      this.qualitySettings.postProcessing = false;
      this.maxBatchSize = 50;
      this.enableFrustumCulling = true;
      this.enableSpriteBatching = true;
    }
  }

  private detectLowEndDevice(): boolean {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory && memory < 4) return true; // Less than 4GB RAM
    if (cores && cores < 4) return true; // Less than 4 CPU cores
    
    return false;
  }

  private setupCameraTransform(interpolation: number, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    // Apply viewport scaling and centering
    ctx.translate(this.viewport.offset.x, this.viewport.offset.y);
    ctx.scale(this.viewport.scale, this.viewport.scale);
    
    // Apply camera transform
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.rotate(this.camera.rotation);
    ctx.translate(-this.camera.position.x, -this.camera.position.y);
  }

  private cullNodes(nodes: Node[]): Node[] {
    if (!this.enableFrustumCulling) {
      return nodes.filter(node => node.visible && node.isWorldVisible());
    }

    const visibleNodes: Node[] = [];
    const frustum = this.calculateFrustum();

    for (const node of nodes) {
      if (node.visible && node.isWorldVisible()) {
        if (this.isNodeInFrustum(node, frustum)) {
          visibleNodes.push(node);
        } else {
          this.renderStats.culledNodes++;
        }
      }
    }

    return visibleNodes;
  }

  private calculateFrustum(): { left: number; right: number; top: number; bottom: number } {
    const halfWidth = this.canvas.width / (2 * this.camera.zoom);
    const halfHeight = this.canvas.height / (2 * this.camera.zoom);
    
    return {
      left: this.camera.position.x - halfWidth,
      right: this.camera.position.x + halfWidth,
      top: this.camera.position.y - halfHeight,
      bottom: this.camera.position.y + halfHeight
    };
  }

  private isNodeInFrustum(node: Node, frustum: { left: number; right: number; top: number; bottom: number }): boolean {
    const worldTransform = node.getWorldTransform();
    const bounds = this.getNodeBounds(node, worldTransform);
    
    return !(
      bounds.right < frustum.left ||
      bounds.left > frustum.right ||
      bounds.bottom < frustum.top ||
      bounds.top > frustum.bottom
    );
  }

  private getNodeBounds(node: Node, transform: Transform2D): { left: number; right: number; top: number; bottom: number } {
    // Simplified bounds calculation - in a full implementation this would be more sophisticated
    const size = 50; // Default node size
    const halfSize = size / 2;
    
    return {
      left: transform.position.x - halfSize,
      right: transform.position.x + halfSize,
      top: transform.position.y - halfSize,
      bottom: transform.position.y + halfSize
    };
  }

  private renderOptimized(nodes: Node[], context: RenderContext): void {
    if (this.enableSpriteBatching) {
      this.renderWithBatching(nodes, context);
    } else {
      // Fallback to regular rendering
      for (const node of nodes) {
        this.renderNode(node, context);
      }
    }
  }

  private renderWithBatching(nodes: Node[], context: RenderContext): void {
    // Collect sprites for batching
    this.spriteBatch = [];
    const nonBatchableNodes: Node[] = [];

    for (const node of nodes) {
      if (node.type === 'Sprite' && this.canBatchSprite(node)) {
        this.spriteBatch.push(node);
      } else {
        nonBatchableNodes.push(node);
      }
    }

    // Render batched sprites
    if (this.spriteBatch.length > 0) {
      this.renderSpriteBatch(context);
    }

    // Render non-batchable nodes
    for (const node of nonBatchableNodes) {
      this.renderNode(node, context);
    }
  }

  private canBatchSprite(node: Node): boolean {
    const transform = node.getWorldTransform();
    
    // Only batch sprites with simple transforms
    return (
      transform.rotation === 0 &&
      transform.skew.x === 0 &&
      transform.skew.y === 0 &&
      transform.alpha === 1
    );
  }

  private renderSpriteBatch(context: RenderContext): void {
    if (this.spriteBatch.length === 0) return;

    context.ctx.save();

    // Sort sprites by texture/color for better batching
    this.spriteBatch.sort((a, b) => {
      const aSprite = a as any;
      const bSprite = b as any;
      return (aSprite.texture || aSprite.color || '').localeCompare(bSprite.texture || bSprite.color || '');
    });

    // Render all sprites in batch
    let currentTexture = '';
    for (const node of this.spriteBatch) {
      const sprite = node as any;
      const transform = node.getWorldTransform();
      
      // Change fill style only when texture/color changes
      const texture = sprite.texture || sprite.color || context.theme.colors.primary;
      if (texture !== currentTexture) {
        context.ctx.fillStyle = texture;
        currentTexture = texture;
      }

      // Render sprite
      const size = 50; // Default sprite size
      context.ctx.fillRect(
        transform.position.x - size/2, 
        transform.position.y - size/2, 
        size * transform.scale.x, 
        size * transform.scale.y
      );
      
      this.renderStats.sprites++;
      this.renderStats.batchedSprites++;
    }

    context.ctx.restore();
    this.renderStats.drawCalls++;
  }

  private getMemoryUsage(): number {
    if (this.memoryManager) {
      return this.memoryManager.getCurrentMemoryUsage() / 1024 / 1024; // Convert to MB
    }
    
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    
    return 0;
  }

  // Public optimization methods

  setPerformanceMonitor(monitor: PerformanceMonitor): void {
    this.performanceMonitor = monitor;
    
    // Listen for quality changes
    monitor.setCallbacks({
      onQualityChange: (settings) => {
        this.updateQualitySettings(settings);
      }
    });
  }

  setMemoryManager(manager: MemoryManager): void {
    this.memoryManager = manager;
  }

  setAccessibilityManager(manager: AccessibilityManager): void {
    this.accessibilityManager = manager;
  }

  private updateQualitySettings(settings: QualitySettings): void {
    this.qualitySettings = settings;
    
    // Apply render scale
    if (settings.renderScale !== 1.0 && this.offscreenCanvas) {
      const scaledWidth = Math.floor(this.canvas.width * settings.renderScale);
      const scaledHeight = Math.floor(this.canvas.height * settings.renderScale);
      
      this.offscreenCanvas.width = scaledWidth;
      this.offscreenCanvas.height = scaledHeight;
    }

    // Update texture filtering
    this.ctx.imageSmoothingEnabled = settings.textureFiltering;
    if (this.offscreenCtx) {
      this.offscreenCtx.imageSmoothingEnabled = settings.textureFiltering;
    }

    // Adjust batch size based on quality
    this.maxBatchSize = Math.floor(100 * settings.particleDensity);
  }

  getRenderStats(): RenderStats {
    return { ...this.renderStats };
  }

  optimizeForMobile(): void {
    this.qualitySettings.renderScale = 0.75;
    this.qualitySettings.textureFiltering = false;
    this.qualitySettings.postProcessing = false;
    this.maxBatchSize = 50;
    this.enableFrustumCulling = true;
    this.enableSpriteBatching = true;
    
    this.updateQualitySettings(this.qualitySettings);
  }

  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const stats = this.renderStats;
    
    if (stats.drawCalls > 100) {
      recommendations.push('High draw call count - consider sprite batching');
    }
    
    if (stats.renderTime > 16) {
      recommendations.push('Render time exceeds 16ms - reduce visual complexity');
    }
    
    if (stats.sprites > 200) {
      recommendations.push('Too many sprites - consider culling off-screen objects');
    }

    if (stats.culledNodes / (stats.sprites + stats.culledNodes) < 0.1) {
      recommendations.push('Low culling efficiency - check frustum culling implementation');
    }
    
    return recommendations;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = Math.floor(width * this.qualitySettings.renderScale);
      this.offscreenCanvas.height = Math.floor(height * this.qualitySettings.renderScale);
    }
    
    this.optimizeCanvasSettings();
  }
}