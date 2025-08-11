/**
 * Post-processing effects module for visual enhancement
 * Implements vignette, bloom-lite, and color grading effects
 */

import { Node, Vector2, Transform2D } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition } from '../types/modules.js';
import { ModuleRegistry } from '../core/module-registry.js';

/**
 * Post-processing effect types
 */
export type PostEffectType = 'vignette' | 'bloom-lite' | 'color-grading';

/**
 * Base interface for all post-processing effects
 */
export interface PostEffect {
  type: PostEffectType;
  enabled: boolean;
  intensity: number; // 0-1 range
}

/**
 * Vignette effect parameters
 */
export interface VignetteEffect extends PostEffect {
  type: 'vignette';
  radius: number;     // Inner radius (0-1)
  softness: number;   // Edge softness (0-1)
  color: string;      // Vignette color (hex)
}

/**
 * Bloom-lite effect parameters
 */
export interface BloomLiteEffect extends PostEffect {
  type: 'bloom-lite';
  threshold: number;  // Brightness threshold (0-1)
  radius: number;     // Blur radius in pixels
  strength: number;   // Bloom strength multiplier
}

/**
 * Color grading effect parameters
 */
export interface ColorGradingEffect extends PostEffect {
  type: 'color-grading';
  brightness: number; // -1 to 1
  contrast: number;   // -1 to 1
  saturation: number; // -1 to 1
  hue: number;        // -180 to 180 degrees
  gamma: number;      // 0.1 to 3.0
}

/**
 * PostChain node data
 */
export interface PostChainData {
  effects: PostEffect[];
  renderTarget?: string; // Optional render target ID
}

/**
 * PostChain node type
 */
export interface PostChainNode extends Node {
  type: 'PostChain';
  effects: PostEffect[];
  renderTarget?: string;
}

/**
 * Framebuffer management for multi-pass rendering
 */
export class FramebufferManager {
  private buffers = new Map<string, HTMLCanvasElement>();
  private contexts = new Map<string, CanvasRenderingContext2D>();

  /**
   * Create or get a framebuffer with specified dimensions
   */
  getFramebuffer(id: string, width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    let canvas = this.buffers.get(id);
    let ctx = this.contexts.get(id);

    if (!canvas || canvas.width !== width || canvas.height !== height) {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D rendering context');
      }
      
      this.buffers.set(id, canvas);
      this.contexts.set(id, ctx);
    }

    return { canvas, ctx: ctx! };
  }

  /**
   * Clear a framebuffer
   */
  clearFramebuffer(id: string): void {
    const ctx = this.contexts.get(id);
    if (ctx) {
      const canvas = this.buffers.get(id)!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Copy content from one framebuffer to another
   */
  copyFramebuffer(sourceId: string, targetId: string): void {
    const sourceCanvas = this.buffers.get(sourceId);
    const targetCtx = this.contexts.get(targetId);
    
    if (sourceCanvas && targetCtx) {
      const targetCanvas = this.buffers.get(targetId)!;
      targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      targetCtx.drawImage(sourceCanvas, 0, 0);
    }
  }

  /**
   * Cleanup all framebuffers
   */
  cleanup(): void {
    this.buffers.clear();
    this.contexts.clear();
  }
}

/**
 * Post-processing effects renderer
 */
export class PostFXRenderer {
  private framebufferManager = new FramebufferManager();

  /**
   * Apply vignette effect
   */
  applyVignette(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    effect: VignetteEffect
  ): void {
    const { width, height } = sourceCanvas;
    
    // Draw source image
    targetCtx.drawImage(sourceCanvas, 0, 0);
    
    if (!effect.enabled || effect.intensity <= 0) {
      return;
    }

    // Create vignette gradient
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const innerRadius = maxRadius * effect.radius;
    const outerRadius = innerRadius + (maxRadius - innerRadius) * effect.softness;

    const gradient = targetCtx.createRadialGradient(
      centerX, centerY, innerRadius,
      centerX, centerY, outerRadius
    );
    
    // Parse vignette color and apply intensity
    const vignetteColor = this.hexToRgba(effect.color, effect.intensity);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, vignetteColor);

    // Apply vignette overlay
    targetCtx.globalCompositeOperation = 'multiply';
    targetCtx.fillStyle = gradient;
    targetCtx.fillRect(0, 0, width, height);
    targetCtx.globalCompositeOperation = 'source-over';
  }

  /**
   * Apply bloom-lite effect (simplified bloom)
   */
  applyBloomLite(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    effect: BloomLiteEffect
  ): void {
    const { width, height } = sourceCanvas;
    
    if (!effect.enabled || effect.intensity <= 0) {
      targetCtx.drawImage(sourceCanvas, 0, 0);
      return;
    }

    // Get temporary framebuffer for bloom processing
    const { canvas: bloomBuffer, ctx: bloomCtx } = this.framebufferManager.getFramebuffer(
      'bloom-temp', width, height
    );

    // Extract bright pixels
    this.extractBrightPixels(sourceCanvas, bloomCtx, effect.threshold);

    // Apply blur (simplified box blur)
    this.applyBoxBlur(bloomBuffer, bloomCtx, effect.radius);

    // Composite original + bloom
    targetCtx.drawImage(sourceCanvas, 0, 0);
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = effect.strength * effect.intensity;
    targetCtx.drawImage(bloomBuffer, 0, 0);
    targetCtx.globalAlpha = 1;
    targetCtx.globalCompositeOperation = 'source-over';
  }

  /**
   * Apply color grading effect
   */
  applyColorGrading(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    effect: ColorGradingEffect
  ): void {
    const { width, height } = sourceCanvas;
    
    // Draw source image
    targetCtx.drawImage(sourceCanvas, 0, 0);
    
    if (!effect.enabled || effect.intensity <= 0) {
      return;
    }

    // Get image data for pixel manipulation
    const imageData = targetCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Apply color grading to each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;

      // Apply color grading transformations
      const processed = this.processPixel(r, g, b, effect);
      
      // Lerp between original and processed based on intensity
      data[i] = Math.round(this.lerp(r, processed.r, effect.intensity) * 255);
      data[i + 1] = Math.round(this.lerp(g, processed.g, effect.intensity) * 255);
      data[i + 2] = Math.round(this.lerp(b, processed.b, effect.intensity) * 255);
    }

    // Put processed image data back
    targetCtx.putImageData(imageData, 0, 0);
  }

  /**
   * Extract bright pixels above threshold
   */
  private extractBrightPixels(
    sourceCanvas: HTMLCanvasElement,
    targetCtx: CanvasRenderingContext2D,
    threshold: number
  ): void {
    const { width, height } = sourceCanvas;
    const sourceCtx = sourceCanvas.getContext('2d')!;
    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const sourceData = imageData.data;
    
    const brightData = targetCtx.createImageData(width, height);
    const brightPixels = brightData.data;

    for (let i = 0; i < sourceData.length; i += 4) {
      const r = sourceData[i] / 255;
      const g = sourceData[i + 1] / 255;
      const b = sourceData[i + 2] / 255;
      const a = sourceData[i + 3] / 255;

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      if (luminance > threshold) {
        // Keep bright pixels
        brightPixels[i] = sourceData[i];
        brightPixels[i + 1] = sourceData[i + 1];
        brightPixels[i + 2] = sourceData[i + 2];
        brightPixels[i + 3] = sourceData[i + 3];
      } else {
        // Make dark pixels transparent
        brightPixels[i] = 0;
        brightPixels[i + 1] = 0;
        brightPixels[i + 2] = 0;
        brightPixels[i + 3] = 0;
      }
    }

    targetCtx.putImageData(brightData, 0, 0);
  }

  /**
   * Apply simple box blur
   */
  private applyBoxBlur(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, radius: number): void {
    if (radius <= 0) return;

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const blurredData = new Uint8ClampedArray(data);

    const kernelSize = Math.floor(radius) * 2 + 1;
    const kernelRadius = Math.floor(kernelSize / 2);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let kx = -kernelRadius; kx <= kernelRadius; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const idx = (y * width + px) * 4;
          
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        blurredData[idx] = r / count;
        blurredData[idx + 1] = g / count;
        blurredData[idx + 2] = b / count;
        blurredData[idx + 3] = a / count;
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let ky = -kernelRadius; ky <= kernelRadius; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const idx = (py * width + x) * 4;
          
          r += blurredData[idx];
          g += blurredData[idx + 1];
          b += blurredData[idx + 2];
          a += blurredData[idx + 3];
          count++;
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Process a single pixel with color grading
   */
  private processPixel(r: number, g: number, b: number, effect: ColorGradingEffect): { r: number; g: number; b: number } {
    // Apply gamma correction
    r = Math.pow(r, 1 / effect.gamma);
    g = Math.pow(g, 1 / effect.gamma);
    b = Math.pow(b, 1 / effect.gamma);

    // Apply brightness
    r = Math.max(0, Math.min(1, r + effect.brightness));
    g = Math.max(0, Math.min(1, g + effect.brightness));
    b = Math.max(0, Math.min(1, b + effect.brightness));

    // Apply contrast
    r = Math.max(0, Math.min(1, (r - 0.5) * (1 + effect.contrast) + 0.5));
    g = Math.max(0, Math.min(1, (g - 0.5) * (1 + effect.contrast) + 0.5));
    b = Math.max(0, Math.min(1, (b - 0.5) * (1 + effect.contrast) + 0.5));

    // Convert to HSV for saturation and hue adjustments
    const hsv = this.rgbToHsv(r, g, b);
    
    // Apply saturation
    hsv.s = Math.max(0, Math.min(1, hsv.s * (1 + effect.saturation)));
    
    // Apply hue shift
    hsv.h = (hsv.h + effect.hue / 360) % 1;
    if (hsv.h < 0) hsv.h += 1;

    // Convert back to RGB
    return this.hsvToRgb(hsv.h, hsv.s, hsv.v);
  }

  /**
   * Convert RGB to HSV
   */
  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
    }
    h /= 6;
    if (h < 0) h += 1;

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return { h, s, v };
  }

  /**
   * Convert HSV to RGB
   */
  private hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    const hSector = Math.floor(h * 6);

    switch (hSector) {
      case 0: r = c; g = x; b = 0; break;
      case 1: r = x; g = c; b = 0; break;
      case 2: r = 0; g = c; b = x; break;
      case 3: r = 0; g = x; b = c; break;
      case 4: r = x; g = 0; b = c; break;
      case 5: r = c; g = 0; b = x; break;
    }

    return {
      r: r + m,
      g: g + m,
      b: b + m
    };
  }

  /**
   * Convert hex color to RGBA string
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.framebufferManager.cleanup();
  }
}/**

 * PostFX render module implementation
 */
export class PostFXRenderModule implements RenderModule {
  name = 'postfx';
  nodeTypes = ['PostChain'];
  
  private renderer = new PostFXRenderer();
  private framebufferManager = new FramebufferManager();

  render(node: Node, context: RenderContext): void {
    const postChainNode = node as PostChainNode;
    const postChainData = this.getPostChainData(postChainNode);
    
    if (!postChainData || postChainData.effects.length === 0) {
      return;
    }

    // Get the current canvas content as source
    const sourceCanvas = context.canvas;
    const { width, height } = sourceCanvas;

    // Create working framebuffers
    const { canvas: buffer1, ctx: ctx1 } = this.framebufferManager.getFramebuffer('postfx-1', width, height);
    const { canvas: buffer2, ctx: ctx2 } = this.framebufferManager.getFramebuffer('postfx-2', width, height);

    // Copy current canvas to first buffer
    ctx1.drawImage(sourceCanvas, 0, 0);

    let currentSource = buffer1;
    let currentTarget = buffer2;
    let currentTargetCtx = ctx2;

    // Apply each effect in sequence
    for (const effect of postChainData.effects) {
      if (!effect.enabled) continue;

      // Clear target buffer
      currentTargetCtx.clearRect(0, 0, width, height);

      // Apply the effect
      switch (effect.type) {
        case 'vignette':
          this.renderer.applyVignette(currentSource, currentTargetCtx, effect as VignetteEffect);
          break;
        case 'bloom-lite':
          this.renderer.applyBloomLite(currentSource, currentTargetCtx, effect as BloomLiteEffect);
          break;
        case 'color-grading':
          this.renderer.applyColorGrading(currentSource, currentTargetCtx, effect as ColorGradingEffect);
          break;
        default:
          console.warn(`Unknown post-processing effect: ${effect.type}`);
          currentTargetCtx.drawImage(currentSource, 0, 0);
      }

      // Swap buffers for next effect
      [currentSource, currentTarget] = [currentTarget, currentSource];
      currentTargetCtx = currentSource === buffer1 ? ctx1 : ctx2;
    }

    // Draw final result back to main canvas
    context.ctx.drawImage(currentTarget, 0, 0);
  }

  private getPostChainData(node: PostChainNode): PostChainData | null {
    if (!node.effects || node.effects.length === 0) {
      return null;
    }

    return {
      effects: node.effects,
      renderTarget: node.renderTarget
    };
  }

  /**
   * Create default effects
   */
  static createVignetteEffect(params: Partial<VignetteEffect> = {}): VignetteEffect {
    return {
      type: 'vignette',
      enabled: true,
      intensity: 0.5,
      radius: 0.3,
      softness: 0.7,
      color: '#000000',
      ...params
    };
  }

  static createBloomLiteEffect(params: Partial<BloomLiteEffect> = {}): BloomLiteEffect {
    return {
      type: 'bloom-lite',
      enabled: true,
      intensity: 0.3,
      threshold: 0.8,
      radius: 4,
      strength: 1.5,
      ...params
    };
  }

  static createColorGradingEffect(params: Partial<ColorGradingEffect> = {}): ColorGradingEffect {
    return {
      type: 'color-grading',
      enabled: true,
      intensity: 1.0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      gamma: 1.0,
      ...params
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.renderer.cleanup();
    this.framebufferManager.cleanup();
  }
}

/**
 * PostFX module definition for registration
 */
export const PostFXModuleDefinition: ModuleDefinition = {
  name: 'postfx',
  nodeTypes: ['PostChain'],
  actions: ['setPostFX', 'tweenPostFX', 'enablePostFX', 'disablePostFX'],
  triggers: [],
  dependencies: [],
  size: 12 // Estimated KB
};

/**
 * Register the PostFX module
 */
export function registerPostFXModule(): void {
  const registry = ModuleRegistry.getInstance();
  
  // Register module definition
  registry.registerModule(PostFXModuleDefinition);
  
  // Register render module
  const renderModule = new PostFXRenderModule();
  registry.registerRenderModule(renderModule);
  
  // Register action handlers
  registry.registerActionHandler('setPostFX', (params: any) => {
    // TODO: Implement PostFX parameter setting action handler
    console.log('setPostFX action:', params);
  });
  
  registry.registerActionHandler('tweenPostFX', (params: any) => {
    // TODO: Implement PostFX parameter tweening action handler
    console.log('tweenPostFX action:', params);
  });

  registry.registerActionHandler('enablePostFX', (params: any) => {
    // TODO: Implement PostFX enable action handler
    console.log('enablePostFX action:', params);
  });

  registry.registerActionHandler('disablePostFX', (params: any) => {
    // TODO: Implement PostFX disable action handler
    console.log('disablePostFX action:', params);
  });
}