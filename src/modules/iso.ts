/**
 * Isometric tilemap rendering module for fake-3D tile-based games
 * Implements isometric projection math for retro-style strategy and RPG games
 */

import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, TilemapIsoNode } from '../types/modules.js';
import { ModuleRegistry } from '../core/module-registry.js';

/**
 * Isometric tilemap specific node data
 */
export interface TilemapIsoData {
  tileset: string;           // Tileset texture ID
  map: number[][];           // 2D grid of tile indices (0 = empty)
  tileSize: Vector2;         // Size of each tile in pixels
  elevation: number[][];     // Height map for multi-level tiles
  mapWidth: number;          // Width of the map grid
  mapHeight: number;         // Height of the map grid
  tilesetColumns: number;    // Number of columns in tileset
  tilesetRows: number;       // Number of rows in tileset
}

/**
 * Isometric camera parameters
 */
export interface IsoCamera {
  position: Vector2;         // World position (in tile coordinates)
  zoom: number;             // Zoom level
  offset: Vector2;          // Screen offset for centering
}

/**
 * Tile collision data
 */
export interface TileCollision {
  tileX: number;            // Tile X coordinate
  tileY: number;            // Tile Y coordinate
  tileIndex: number;        // Tile type index
  elevation: number;        // Tile elevation
  worldPos: Vector2;        // World position of tile center
}

/**
 * Isometric math utilities
 */
export class IsoMath {
  /**
   * Convert world coordinates to isometric screen coordinates
   */
  static worldToIso(worldX: number, worldY: number, tileSize: Vector2): Vector2 {
    const isoX = (worldX - worldY) * (tileSize.x / 2);
    const isoY = (worldX + worldY) * (tileSize.y / 2);
    
    return { x: isoX, y: isoY };
  }

  /**
   * Convert isometric screen coordinates to world coordinates
   */
  static isoToWorld(isoX: number, isoY: number, tileSize: Vector2): Vector2 {
    const worldX = (isoX / (tileSize.x / 2) + isoY / (tileSize.y / 2)) / 2;
    const worldY = (isoY / (tileSize.y / 2) - isoX / (tileSize.x / 2)) / 2;
    
    return { x: worldX, y: worldY };
  }

  /**
   * Convert tile coordinates to isometric screen coordinates
   */
  static tileToIso(tileX: number, tileY: number, tileSize: Vector2, elevation: number = 0): Vector2 {
    const worldPos = IsoMath.worldToIso(tileX, tileY, tileSize);
    
    // Apply elevation offset (negative Y for higher elevation)
    worldPos.y -= elevation * (tileSize.y / 4);
    
    return worldPos;
  }

  /**
   * Convert screen coordinates to tile coordinates
   */
  static screenToTile(
    screenX: number, 
    screenY: number, 
    camera: IsoCamera, 
    tileSize: Vector2
  ): Vector2 {
    // Adjust for camera position and offset
    const adjustedX = (screenX - camera.offset.x) / camera.zoom + camera.position.x;
    const adjustedY = (screenY - camera.offset.y) / camera.zoom + camera.position.y;
    
    // Convert to world coordinates
    const worldPos = IsoMath.isoToWorld(adjustedX, adjustedY, tileSize);
    
    return {
      x: Math.floor(worldPos.x),
      y: Math.floor(worldPos.y)
    };
  }

  /**
   * Get tile bounds in screen coordinates
   */
  static getTileBounds(
    tileX: number, 
    tileY: number, 
    tileSize: Vector2, 
    elevation: number = 0
  ): { 
    topLeft: Vector2; 
    topRight: Vector2; 
    bottomLeft: Vector2; 
    bottomRight: Vector2; 
  } {
    const center = IsoMath.tileToIso(tileX, tileY, tileSize, elevation);
    const halfWidth = tileSize.x / 2;
    const halfHeight = tileSize.y / 2;
    
    return {
      topLeft: { x: center.x - halfWidth, y: center.y },
      topRight: { x: center.x, y: center.y - halfHeight },
      bottomLeft: { x: center.x, y: center.y + halfHeight },
      bottomRight: { x: center.x + halfWidth, y: center.y }
    };
  }

  /**
   * Check if a point is inside a tile diamond
   */
  static isPointInTile(
    pointX: number, 
    pointY: number, 
    tileX: number, 
    tileY: number, 
    tileSize: Vector2, 
    elevation: number = 0
  ): boolean {
    const center = IsoMath.tileToIso(tileX, tileY, tileSize, elevation);
    
    // Use diamond-shaped collision detection relative to tile center
    const relativeX = pointX - center.x;
    const relativeY = pointY - center.y;
    
    // Transform to normalized diamond coordinates
    // For a diamond, we check if |x/halfWidth| + |y/halfHeight| <= 1
    const halfWidth = tileSize.x / 2;
    const halfHeight = tileSize.y / 2;
    
    const normalizedX = relativeX / halfWidth;
    const normalizedY = relativeY / halfHeight;
    
    return Math.abs(normalizedX) + Math.abs(normalizedY) <= 1;
  }

  /**
   * Get tiles that should be rendered for the current viewport
   */
  static getVisibleTiles(
    camera: IsoCamera,
    viewport: { width: number; height: number },
    tileSize: Vector2,
    mapWidth: number,
    mapHeight: number
  ): { startX: number; endX: number; startY: number; endY: number } {
    // Calculate screen bounds in world coordinates
    const topLeft = IsoMath.screenToTile(0, 0, camera, tileSize);
    const bottomRight = IsoMath.screenToTile(viewport.width, viewport.height, camera, tileSize);
    
    // Add padding to ensure we don't miss tiles at edges
    const padding = 2;
    
    return {
      startX: Math.max(0, Math.floor(topLeft.x) - padding),
      endX: Math.min(mapWidth - 1, Math.ceil(bottomRight.x) + padding),
      startY: Math.max(0, Math.floor(topLeft.y) - padding),
      endY: Math.min(mapHeight - 1, Math.ceil(bottomRight.y) + padding)
    };
  }

  /**
   * Calculate render order for tiles (back to front)
   */
  static calculateRenderOrder(
    startX: number, 
    endX: number, 
    startY: number, 
    endY: number
  ): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    
    // Render from back to front (top-left to bottom-right in tile coordinates)
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        tiles.push({ x, y });
      }
    }
    
    // Sort by render priority (back to front)
    tiles.sort((a, b) => {
      const priorityA = a.x + a.y;
      const priorityB = b.x + b.y;
      return priorityA - priorityB;
    });
    
    return tiles;
  }

  /**
   * Create a default isometric camera
   */
  static createDefaultCamera(): IsoCamera {
    return {
      position: { x: 0, y: 0 },
      zoom: 1.0,
      offset: { x: 0, y: 0 }
    };
  }

  /**
   * Get tile collision data at world position
   */
  static getTileCollision(
    worldX: number,
    worldY: number,
    map: number[][],
    elevation: number[][],
    tileSize: Vector2
  ): TileCollision | null {
    const tileX = Math.floor(worldX);
    const tileY = Math.floor(worldY);
    
    // Check bounds
    if (tileX < 0 || tileX >= map[0]?.length || tileY < 0 || tileY >= map.length) {
      return null;
    }
    
    const tileIndex = map[tileY][tileX];
    const tileElevation = elevation[tileY]?.[tileX] || 0;
    
    // Only return collision for non-empty tiles
    if (tileIndex === 0) {
      return null;
    }
    
    const worldPos = IsoMath.tileToIso(tileX, tileY, tileSize, tileElevation);
    
    return {
      tileX,
      tileY,
      tileIndex,
      elevation: tileElevation,
      worldPos
    };
  }
}

/**
 * Isometric render module implementation
 */
export class IsoRenderModule implements RenderModule {
  name = 'iso';
  nodeTypes = ['TilemapIso'];
  
  private tilesetCache = new Map<string, HTMLImageElement>();
  private defaultCamera: IsoCamera;

  constructor() {
    this.defaultCamera = IsoMath.createDefaultCamera();
  }

  render(node: Node, context: RenderContext): void {
    const isoNode = node as TilemapIsoNode;
    const isoData = this.getIsoData(isoNode);
    
    if (!isoData) {
      console.warn('TilemapIso node missing required data');
      return;
    }

    // Get or create iso camera from scene
    const isoCamera = this.getIsoCamera(context) || this.defaultCamera;
    
    // Load tileset
    const tileset = this.getTileset(isoData.tileset);
    if (!tileset) {
      this.renderPlaceholder(context, isoData, isoCamera);
      return;
    }

    // Render isometric tilemap
    this.renderIsoTilemap(context, isoData, isoCamera, tileset);
  }

  private getIsoData(node: TilemapIsoNode): TilemapIsoData | null {
    // Extract isometric specific data from node
    const data = node as any;
    
    if (!data.map || !Array.isArray(data.map) || data.map.length === 0) {
      return null;
    }

    const mapHeight = data.map.length;
    const mapWidth = mapHeight > 0 ? data.map[0].length : 0;

    return {
      tileset: data.tileset || '',
      map: data.map,
      tileSize: data.tileSize || { x: 64, y: 32 },
      elevation: data.elevation || Array(mapHeight).fill(null).map(() => Array(mapWidth).fill(0)),
      mapWidth,
      mapHeight,
      tilesetColumns: data.tilesetColumns || 8,
      tilesetRows: data.tilesetRows || 8
    };
  }

  private getIsoCamera(context: RenderContext): IsoCamera | null {
    // Look for iso camera data in the render context
    // This would be set by iso specific actions
    return (context as any).isoCamera || null;
  }

  private getTileset(tilesetId: string): HTMLImageElement | null {
    if (!tilesetId) return null;
    
    // Check cache first
    if (this.tilesetCache.has(tilesetId)) {
      return this.tilesetCache.get(tilesetId)!;
    }

    // For now, return null - in a full implementation, this would load the tileset
    // TODO: Integrate with asset loading system
    return null;
  }

  private renderPlaceholder(
    context: RenderContext, 
    data: TilemapIsoData, 
    camera: IsoCamera
  ): void {
    const { ctx, viewport } = context;
    
    // Clear background
    ctx.fillStyle = '#2F4F2F'; // Dark slate gray
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    
    // Get visible tiles
    const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, data.tileSize, data.mapWidth, data.mapHeight);
    const renderOrder = IsoMath.calculateRenderOrder(
      visibleTiles.startX, 
      visibleTiles.endX, 
      visibleTiles.startY, 
      visibleTiles.endY
    );
    
    // Render placeholder tiles
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    
    for (const tile of renderOrder) {
      const tileIndex = data.map[tile.y][tile.x];
      if (tileIndex === 0) continue; // Skip empty tiles
      
      const elevation = data.elevation[tile.y][tile.x];
      const screenPos = IsoMath.tileToIso(tile.x, tile.y, data.tileSize, elevation);
      
      // Apply camera transform
      const finalX = (screenPos.x - camera.position.x) * camera.zoom + camera.offset.x + viewport.width / 2;
      const finalY = (screenPos.y - camera.position.y) * camera.zoom + camera.offset.y + viewport.height / 2;
      
      // Draw diamond-shaped tile outline
      this.drawTileDiamond(ctx, finalX, finalY, data.tileSize, camera.zoom, tileIndex, elevation);
    }
  }

  private renderIsoTilemap(
    context: RenderContext,
    data: TilemapIsoData,
    camera: IsoCamera,
    tileset: HTMLImageElement
  ): void {
    const { ctx, viewport } = context;
    
    // Clear background
    ctx.fillStyle = '#2F4F2F'; // Dark slate gray
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    
    // Get visible tiles
    const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, data.tileSize, data.mapWidth, data.mapHeight);
    const renderOrder = IsoMath.calculateRenderOrder(
      visibleTiles.startX, 
      visibleTiles.endX, 
      visibleTiles.startY, 
      visibleTiles.endY
    );
    
    // Calculate tileset tile size
    const tilesetTileWidth = tileset.width / data.tilesetColumns;
    const tilesetTileHeight = tileset.height / data.tilesetRows;
    
    // Render tiles
    for (const tile of renderOrder) {
      const tileIndex = data.map[tile.y][tile.x];
      if (tileIndex === 0) continue; // Skip empty tiles
      
      const elevation = data.elevation[tile.y][tile.x];
      this.renderTile(
        ctx, 
        tile.x, 
        tile.y, 
        tileIndex, 
        elevation, 
        data, 
        camera, 
        viewport, 
        tileset, 
        tilesetTileWidth, 
        tilesetTileHeight
      );
    }
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    tileIndex: number,
    elevation: number,
    data: TilemapIsoData,
    camera: IsoCamera,
    viewport: { width: number; height: number },
    tileset: HTMLImageElement,
    tilesetTileWidth: number,
    tilesetTileHeight: number
  ): void {
    // Calculate screen position
    const screenPos = IsoMath.tileToIso(tileX, tileY, data.tileSize, elevation);
    const finalX = (screenPos.x - camera.position.x) * camera.zoom + camera.offset.x + viewport.width / 2;
    const finalY = (screenPos.y - camera.position.y) * camera.zoom + camera.offset.y + viewport.height / 2;
    
    // Calculate tileset source coordinates
    const tilesetX = ((tileIndex - 1) % data.tilesetColumns) * tilesetTileWidth;
    const tilesetY = Math.floor((tileIndex - 1) / data.tilesetColumns) * tilesetTileHeight;
    
    // Calculate destination size
    const destWidth = data.tileSize.x * camera.zoom;
    const destHeight = data.tileSize.y * camera.zoom;
    
    // Draw tile
    ctx.drawImage(
      tileset,
      tilesetX, tilesetY, tilesetTileWidth, tilesetTileHeight, // Source
      finalX - destWidth / 2, finalY - destHeight / 2, destWidth, destHeight // Destination
    );
    
    // Apply elevation shading
    if (elevation > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1 * elevation;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(
        finalX - destWidth / 2, 
        finalY - destHeight / 2, 
        destWidth, 
        destHeight
      );
      ctx.restore();
    }
  }

  private drawTileDiamond(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    tileSize: Vector2,
    zoom: number,
    tileIndex: number,
    elevation: number
  ): void {
    const halfWidth = (tileSize.x / 2) * zoom;
    const halfHeight = (tileSize.y / 2) * zoom;
    
    // Draw diamond outline
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - halfHeight); // Top
    ctx.lineTo(centerX + halfWidth, centerY);  // Right
    ctx.lineTo(centerX, centerY + halfHeight); // Bottom
    ctx.lineTo(centerX - halfWidth, centerY);  // Left
    ctx.closePath();
    ctx.stroke();
    
    // Fill with color based on tile index
    const hue = (tileIndex * 60) % 360;
    ctx.fillStyle = `hsl(${hue}, 50%, ${50 + elevation * 10}%)`;
    ctx.fill();
    
    // Draw elevation indicator
    if (elevation > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${12 * zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(elevation.toString(), centerX, centerY + 4);
    }
  }
}

/**
 * Isometric module definition for registration
 */
export const IsoModuleDefinition: ModuleDefinition = {
  name: 'iso',
  nodeTypes: ['TilemapIso'],
  actions: ['setIsoCamera', 'moveIsoCamera', 'setTileElevation'],
  triggers: ['on.tileClick', 'on.tileHover'],
  dependencies: [],
  size: 10 // Estimated KB
};

/**
 * Register the isometric module
 */
export function registerIsoModule(): void {
  const registry = ModuleRegistry.getInstance();
  
  // Register module definition
  registry.registerModule(IsoModuleDefinition);
  
  // Register render module
  const renderModule = new IsoRenderModule();
  registry.registerRenderModule(renderModule);
  
  // Register action handlers
  registry.registerActionHandler('setIsoCamera', (params: any) => {
    // TODO: Implement iso camera action handler
    console.log('setIsoCamera action:', params);
  });
  
  registry.registerActionHandler('moveIsoCamera', (params: any) => {
    // TODO: Implement iso camera movement action handler
    console.log('moveIsoCamera action:', params);
  });
  
  registry.registerActionHandler('setTileElevation', (params: any) => {
    // TODO: Implement tile elevation action handler
    console.log('setTileElevation action:', params);
  });
}