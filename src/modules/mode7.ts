/**
 * Mode-7 rendering module for fake-3D plane effects
 * Implements perspective transformation math for retro-style racing games
 */

import { Node, Vector2, Transform2D } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, Mode7PlaneNode } from '../types/modules.js';
import { ModuleRegistry } from '../core/module-registry.js';

/**
 * Mode-7 specific node data
 */
export interface Mode7PlaneData {
  texture: string;
  horizon: number;      // Y position of horizon line (0-1, where 0.5 is center)
  scale: number;        // Scale factor for texture mapping
  offset: Vector2;      // Texture offset for scrolling
  textureWidth: number; // Width of texture in pixels
  textureHeight: number; // Height of texture in pixels
}

/**
 * Mode-7 camera parameters
 */
export interface Mode7Camera {
  position: Vector2;    // World position
  rotation: number;     // Camera rotation in radians
  height: number;       // Camera height above ground plane
  pitch: number;        // Camera pitch angle in radians
  fov: number;          // Field of view in radians
}

/**
 * Mode-7 transformation math utilities
 */
export class Mode7Math {
  /**
   * Transform screen coordinates to world coordinates using Mode-7 perspective
   */
  static screenToWorld(
    screenX: number, 
    screenY: number, 
    camera: Mode7Camera, 
    viewport: { width: number; height: number; horizon: number }
  ): Vector2 {
    const { width, height, horizon } = viewport;
    
    // Convert screen coordinates to normalized coordinates
    const normalizedX = (screenX - width / 2) / (width / 2);
    const horizonY = height * horizon;
    
    // Skip horizon line to avoid division by zero
    if (Math.abs(screenY - horizonY) < 0.001) {
      return { x: camera.position.x, y: camera.position.y };
    }
    
    // Calculate distance from camera based on Y position and camera height
    // Points below horizon are closer, points at horizon are infinitely far
    const screenDistanceFromHorizon = screenY - horizonY;
    const distance = camera.height / (screenDistanceFromHorizon / height * Math.tan(camera.pitch));
    
    // Calculate world position relative to camera
    const relativeX = distance * normalizedX;
    const relativeY = distance;
    
    // Rotate by camera rotation and translate by camera position
    const worldX = camera.position.x + relativeX * Math.cos(camera.rotation) - relativeY * Math.sin(camera.rotation);
    const worldY = camera.position.y + relativeX * Math.sin(camera.rotation) + relativeY * Math.cos(camera.rotation);
    
    return { x: worldX, y: worldY };
  }

  /**
   * Transform world coordinates to screen coordinates using Mode-7 perspective
   */
  static worldToScreen(
    worldX: number, 
    worldY: number, 
    camera: Mode7Camera, 
    viewport: { width: number; height: number; horizon: number }
  ): Vector2 {
    const { width, height, horizon } = viewport;
    
    // Translate world coordinates relative to camera
    const relativeX = worldX - camera.position.x;
    const relativeY = worldY - camera.position.y;
    
    // Rotate by camera rotation
    const rotatedX = relativeX * Math.cos(-camera.rotation) - relativeY * Math.sin(-camera.rotation);
    const rotatedY = relativeX * Math.sin(-camera.rotation) + relativeY * Math.cos(-camera.rotation);
    
    // Skip points behind camera or at camera position
    if (rotatedY <= 0.001) {
      return { x: -1, y: -1 }; // Off-screen marker
    }
    
    // Apply perspective projection
    const projectedX = rotatedX / rotatedY;
    const screenDistanceFromHorizon = camera.height / (rotatedY * Math.tan(camera.pitch));
    
    // Convert to screen coordinates
    const screenX = width / 2 + projectedX * (width / 2);
    const screenY = height * horizon + screenDistanceFromHorizon * height;
    
    return { x: screenX, y: screenY };
  }

  /**
   * Calculate texture coordinates for a world position
   */
  static getTextureCoordinates(
    worldPos: Vector2, 
    textureSize: Vector2, 
    scale: number, 
    offset: Vector2
  ): Vector2 {
    const u = (worldPos.x * scale + offset.x) % textureSize.x;
    const v = (worldPos.y * scale + offset.y) % textureSize.y;
    
    // Handle negative modulo
    return {
      x: u < 0 ? u + textureSize.x : u,
      y: v < 0 ? v + textureSize.y : v
    };
  }

  /**
   * Create a default Mode-7 camera
   */
  static createDefaultCamera(): Mode7Camera {
    return {
      position: { x: 0, y: 0 },
      rotation: 0,
      height: 100,
      pitch: Math.PI / 6, // 30 degrees
      fov: Math.PI / 3    // 60 degrees
    };
  }
}

/**
 * Mode-7 render module implementation
 */
export class Mode7RenderModule implements RenderModule {
  name = 'mode7';
  nodeTypes = ['Mode7Plane'];
  
  private textureCache = new Map<string, HTMLImageElement>();
  private defaultCamera: Mode7Camera;

  constructor() {
    this.defaultCamera = Mode7Math.createDefaultCamera();
  }

  render(node: Node, context: RenderContext): void {
    const mode7Node = node as Mode7PlaneNode;
    const mode7Data = this.getMode7Data(mode7Node);
    
    if (!mode7Data) {
      console.warn('Mode7Plane node missing required data');
      return;
    }

    // Get or create Mode-7 camera from scene
    const mode7Camera = this.getMode7Camera(context) || this.defaultCamera;
    
    // Load texture
    const texture = this.getTexture(mode7Data.texture);
    if (!texture) {
      this.renderPlaceholder(context, mode7Data);
      return;
    }

    // Render Mode-7 plane
    const mode7Viewport = {
      width: context.viewport.width,
      height: context.viewport.height,
      horizon: mode7Data.horizon
    };
    this.renderMode7Plane(context, mode7Data, mode7Camera, texture, mode7Viewport);
  }

  private getMode7Data(node: Mode7PlaneNode): Mode7PlaneData | null {
    // Extract Mode-7 specific data from node
    const data = node as any;
    
    if (!data.texture) {
      return null;
    }

    return {
      texture: data.texture,
      horizon: data.horizon ?? 0.5,
      scale: data.scale ?? 1.0,
      offset: data.offset ?? { x: 0, y: 0 },
      textureWidth: data.textureWidth ?? 256,
      textureHeight: data.textureHeight ?? 256
    };
  }

  private getMode7Camera(context: RenderContext): Mode7Camera | null {
    // Look for Mode-7 camera data in the render context
    // This would be set by Mode-7 specific actions
    return (context as any).mode7Camera || null;
  }

  private getTexture(textureId: string): HTMLImageElement | null {
    // Check cache first
    if (this.textureCache.has(textureId)) {
      return this.textureCache.get(textureId)!;
    }

    // For now, return null - in a full implementation, this would load the texture
    // TODO: Integrate with asset loading system
    return null;
  }

  private renderPlaceholder(context: RenderContext, data: Mode7PlaneData): void {
    const { ctx, viewport } = context;
    const horizonY = viewport.height * data.horizon;
    
    // Draw a simple gradient as placeholder
    const gradient = ctx.createLinearGradient(0, horizonY, 0, viewport.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(1, '#228B22'); // Forest green
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, horizonY, viewport.width, viewport.height - horizonY);
    
    // Draw horizon line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(viewport.width, horizonY);
    ctx.stroke();
  }

  private renderMode7Plane(
    context: RenderContext, 
    data: Mode7PlaneData, 
    camera: Mode7Camera, 
    texture: HTMLImageElement,
    mode7Viewport: { width: number; height: number; horizon: number }
  ): void {
    const { ctx } = context;
    const horizonY = mode7Viewport.height * data.horizon;
    
    // Create image data for pixel-by-pixel rendering
    const imageData = ctx.createImageData(mode7Viewport.width, mode7Viewport.height - horizonY);
    const pixels = imageData.data;
    
    // Create canvas for texture sampling
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = texture.width;
    textureCanvas.height = texture.height;
    const textureCtx = textureCanvas.getContext('2d')!;
    textureCtx.drawImage(texture, 0, 0);
    const textureData = textureCtx.getImageData(0, 0, texture.width, texture.height);
    
    // Render each scanline
    for (let y = 0; y < mode7Viewport.height - horizonY; y++) {
      const screenY = horizonY + y;
      this.renderScanline(
        pixels, 
        y, 
        screenY, 
        mode7Viewport.width, 
        data, 
        camera, 
        mode7Viewport, 
        textureData
      );
    }
    
    // Draw the rendered plane
    ctx.putImageData(imageData, 0, horizonY);
  }

  private renderScanline(
    pixels: Uint8ClampedArray,
    scanlineIndex: number,
    screenY: number,
    width: number,
    data: Mode7PlaneData,
    camera: Mode7Camera,
    viewport: { width: number; height: number; horizon: number },
    textureData: ImageData
  ): void {
    const baseIndex = scanlineIndex * width * 4;
    
    for (let x = 0; x < width; x++) {
      // Transform screen coordinates to world coordinates
      const worldPos = Mode7Math.screenToWorld(x, screenY, camera, viewport);
      
      // Get texture coordinates
      const texCoords = Mode7Math.getTextureCoordinates(
        worldPos,
        { x: data.textureWidth, y: data.textureHeight },
        data.scale,
        data.offset
      );
      
      // Sample texture
      const color = this.sampleTexture(textureData, texCoords.x, texCoords.y);
      
      // Set pixel color
      const pixelIndex = baseIndex + x * 4;
      pixels[pixelIndex] = color.r;     // Red
      pixels[pixelIndex + 1] = color.g; // Green
      pixels[pixelIndex + 2] = color.b; // Blue
      pixels[pixelIndex + 3] = 255;     // Alpha
    }
  }

  private sampleTexture(
    textureData: ImageData, 
    u: number, 
    v: number
  ): { r: number; g: number; b: number } {
    const x = Math.floor(u) % textureData.width;
    const y = Math.floor(v) % textureData.height;
    const index = (y * textureData.width + x) * 4;
    
    return {
      r: textureData.data[index],
      g: textureData.data[index + 1],
      b: textureData.data[index + 2]
    };
  }
}

/**
 * Mode-7 module definition for registration
 */
export const Mode7ModuleDefinition: ModuleDefinition = {
  name: 'mode7',
  nodeTypes: ['Mode7Plane'],
  actions: ['setMode7Camera', 'moveMode7Camera'],
  triggers: [],
  dependencies: [],
  size: 8 // Estimated KB
};

/**
 * Register the Mode-7 module
 */
export function registerMode7Module(): void {
  const registry = ModuleRegistry.getInstance();
  
  // Register module definition
  registry.registerModule(Mode7ModuleDefinition);
  
  // Register render module
  const renderModule = new Mode7RenderModule();
  registry.registerRenderModule(renderModule);
  
  // Register action handlers
  registry.registerActionHandler('setMode7Camera', (params: any) => {
    // TODO: Implement Mode-7 camera action handler
    console.log('setMode7Camera action:', params);
  });
  
  registry.registerActionHandler('moveMode7Camera', (params: any) => {
    // TODO: Implement Mode-7 camera movement action handler
    console.log('moveMode7Camera action:', params);
  });
}