/**
 * Raycast rendering module for fake-3D wall and billboard effects
 * Implements raycasting algorithm for retro-style FPS games
 */

import { Node, Vector2 } from '../types/core.js';
import { RenderModule, RenderContext, ModuleDefinition, RaycastMapNode, Billboard } from '../types/modules.js';
import { ModuleRegistry } from '../core/module-registry.js';

/**
 * Raycast specific node data
 */
export interface RaycastMapData {
  map: number[][];           // 2D grid where 0 = empty, >0 = wall texture index
  textures: string[];        // Array of wall texture IDs
  billboards: Billboard[];   // Sprite billboards in the world
  fov: number;              // Field of view in radians
  renderDistance: number;    // Maximum render distance
  mapWidth: number;         // Width of the map grid
  mapHeight: number;        // Height of the map grid
  tileSize: number;         // Size of each map tile in world units
}

/**
 * Raycast camera parameters
 */
export interface RaycastCamera {
  position: Vector2;    // World position
  rotation: number;     // Camera rotation in radians
  height: number;       // Camera height for billboard rendering
  pitch: number;        // Camera pitch offset
}

/**
 * Ray intersection result
 */
export interface RayHit {
  distance: number;     // Distance to hit point
  wallType: number;     // Wall texture index (0 = no hit)
  hitPoint: Vector2;    // World coordinates of hit
  textureX: number;     // X coordinate on wall texture (0-1)
  side: 'north' | 'south' | 'east' | 'west'; // Which side of wall was hit
}

/**
 * Billboard rendering data
 */
export interface BillboardRenderData {
  billboard: Billboard;
  distance: number;
  screenX: number;
  screenSize: number;
  visible: boolean;
}

/**
 * Raycasting math utilities
 */
export class RaycastMath {
  /**
   * Cast a ray and find the first wall intersection
   */
  static castRay(
    origin: Vector2,
    angle: number,
    map: number[][],
    mapWidth: number,
    mapHeight: number,
    tileSize: number,
    maxDistance: number
  ): RayHit {
    const rayDir = { x: Math.cos(angle), y: Math.sin(angle) };
    
    // DDA (Digital Differential Analyzer) algorithm
    let mapX = Math.floor(origin.x / tileSize);
    let mapY = Math.floor(origin.y / tileSize);
    
    // Length of ray from current position to next x or y side
    const deltaDistX = Math.abs(1 / rayDir.x);
    const deltaDistY = Math.abs(1 / rayDir.y);
    
    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;
    
    // Calculate step and initial sideDist
    if (rayDir.x < 0) {
      stepX = -1;
      sideDistX = (origin.x / tileSize - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - origin.x / tileSize) * deltaDistX;
    }
    
    if (rayDir.y < 0) {
      stepY = -1;
      sideDistY = (origin.y / tileSize - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - origin.y / tileSize) * deltaDistY;
    }
    
    // Perform DDA
    let hit = false;
    let side = 0; // 0 = x-side, 1 = y-side
    let distance = 0;
    
    while (!hit && distance < maxDistance) {
      // Jump to next map square, either in x-direction, or in y-direction
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      // Check if ray has hit a wall
      if (mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
        // Hit boundary
        break;
      }
      
      const wallType = map[mapY][mapX];
      if (wallType > 0) {
        hit = true;
        
        // Calculate distance
        if (side === 0) {
          distance = (mapX - origin.x / tileSize + (1 - stepX) / 2) / rayDir.x;
        } else {
          distance = (mapY - origin.y / tileSize + (1 - stepY) / 2) / rayDir.y;
        }
        
        distance = Math.abs(distance * tileSize);
        
        // Calculate hit point
        const hitPoint = {
          x: origin.x + rayDir.x * distance,
          y: origin.y + rayDir.y * distance
        };
        
        // Calculate texture X coordinate
        let textureX: number;
        if (side === 0) {
          textureX = (hitPoint.y / tileSize) % 1;
          if (rayDir.x > 0) textureX = 1 - textureX;
        } else {
          textureX = (hitPoint.x / tileSize) % 1;
          if (rayDir.y < 0) textureX = 1 - textureX;
        }
        
        // Determine wall side
        let wallSide: 'north' | 'south' | 'east' | 'west';
        if (side === 0) {
          wallSide = stepX > 0 ? 'west' : 'east';
        } else {
          wallSide = stepY > 0 ? 'north' : 'south';
        }
        
        return {
          distance,
          wallType,
          hitPoint,
          textureX,
          side: wallSide
        };
      }
    }
    
    // No hit
    return {
      distance: maxDistance,
      wallType: 0,
      hitPoint: { x: 0, y: 0 },
      textureX: 0,
      side: 'north'
    };
  }

  /**
   * Calculate billboard screen position and size
   */
  static calculateBillboard(
    billboard: Billboard,
    camera: RaycastCamera,
    viewport: { width: number; height: number },
    fov: number
  ): BillboardRenderData {
    // Transform billboard position relative to camera
    const relativeX = billboard.position.x - camera.position.x;
    const relativeY = billboard.position.y - camera.position.y;
    
    // Rotate by camera rotation
    const transformedX = relativeX * Math.cos(-camera.rotation) - relativeY * Math.sin(-camera.rotation);
    const transformedY = relativeX * Math.sin(-camera.rotation) + relativeY * Math.cos(-camera.rotation);
    
    const distance = Math.sqrt(transformedX * transformedX + transformedY * transformedY);
    
    // Check if billboard is behind camera or too close
    if (transformedY <= 0.001) {
      return {
        billboard,
        distance,
        screenX: -1,
        screenSize: 0,
        visible: false
      };
    }
    
    // Calculate screen position
    const projectionScale = (viewport.width / 2) / Math.tan(fov / 2);
    const screenX = viewport.width / 2 + (transformedX / transformedY) * projectionScale;
    
    // Calculate screen size based on distance
    const screenSize = (viewport.height * billboard.scale) / transformedY;
    
    // Check if billboard is visible on screen
    const visible = screenX + screenSize / 2 > 0 && 
                   screenX - screenSize / 2 < viewport.width &&
                   screenSize > 1;
    
    return {
      billboard,
      distance,
      screenX,
      screenSize,
      visible
    };
  }

  /**
   * Create a default raycast camera
   */
  static createDefaultCamera(): RaycastCamera {
    return {
      position: { x: 1.5, y: 1.5 }, // Start in center of a tile
      rotation: 0,
      height: 0.5, // Eye level
      pitch: 0
    };
  }
}

/**
 * Raycast render module implementation
 */
export class RaycastRenderModule implements RenderModule {
  name = 'raycast';
  nodeTypes = ['RaycastMap'];
  
  private textureCache = new Map<string, HTMLImageElement>();
  private defaultCamera: RaycastCamera;

  constructor() {
    this.defaultCamera = RaycastMath.createDefaultCamera();
  }

  render(node: Node, context: RenderContext): void {
    const raycastNode = node as RaycastMapNode;
    const raycastData = this.getRaycastData(raycastNode);
    
    if (!raycastData) {
      console.warn('RaycastMap node missing required data');
      return;
    }

    // Get or create raycast camera from scene
    const raycastCamera = this.getRaycastCamera(context) || this.defaultCamera;
    
    // Render raycast scene
    this.renderRaycastScene(context, raycastData, raycastCamera);
  }

  private getRaycastData(node: RaycastMapNode): RaycastMapData | null {
    // Extract raycast specific data from node
    const data = node as any;
    
    if (!data.map || !Array.isArray(data.map)) {
      return null;
    }

    const mapHeight = data.map.length;
    const mapWidth = mapHeight > 0 ? data.map[0].length : 0;

    return {
      map: data.map,
      textures: data.textures || [],
      billboards: data.billboards || [],
      fov: data.fov ?? Math.PI / 3, // 60 degrees default
      renderDistance: data.renderDistance ?? 20,
      mapWidth,
      mapHeight,
      tileSize: data.tileSize ?? 1.0
    };
  }

  private getRaycastCamera(context: RenderContext): RaycastCamera | null {
    // Look for raycast camera data in the render context
    // This would be set by raycast specific actions
    return (context as any).raycastCamera || null;
  }

  private renderRaycastScene(
    context: RenderContext,
    data: RaycastMapData,
    camera: RaycastCamera
  ): void {
    const { ctx, viewport } = context;
    
    // Clear the screen with sky color
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, viewport.width, viewport.height / 2);
    
    // Clear floor with ground color
    ctx.fillStyle = '#8B4513'; // Saddle brown
    ctx.fillRect(0, viewport.height / 2, viewport.width, viewport.height / 2);
    
    // Cast rays for each screen column
    const rays: RayHit[] = [];
    for (let x = 0; x < viewport.width; x++) {
      const rayAngle = camera.rotation + Math.atan((x - viewport.width / 2) / (viewport.width / 2) * Math.tan(data.fov / 2));
      const hit = RaycastMath.castRay(
        camera.position,
        rayAngle,
        data.map,
        data.mapWidth,
        data.mapHeight,
        data.tileSize,
        data.renderDistance
      );
      rays.push(hit);
      
      // Render wall column
      if (hit.wallType > 0) {
        this.renderWallColumn(ctx, x, hit, viewport, camera, data);
      }
    }
    
    // Render billboards (back to front)
    this.renderBillboards(ctx, data.billboards, camera, viewport, data.fov, rays);
  }

  private renderWallColumn(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    hit: RayHit,
    viewport: { width: number; height: number },
    camera: RaycastCamera,
    data: RaycastMapData
  ): void {
    // Apply fish-eye correction
    const correctedDistance = hit.distance * Math.cos(Math.atan((screenX - viewport.width / 2) / (viewport.width / 2) * Math.tan(data.fov / 2)));
    
    // Calculate wall height on screen
    const wallHeight = viewport.height / correctedDistance;
    const wallTop = (viewport.height - wallHeight) / 2 + camera.pitch;
    const wallBottom = wallTop + wallHeight;
    
    // Get wall texture
    const textureIndex = hit.wallType - 1;
    const texture = this.getTexture(data.textures[textureIndex]);
    
    if (texture) {
      this.renderTexturedWallColumn(ctx, screenX, wallTop, wallBottom, hit.textureX, texture, hit.side);
    } else {
      this.renderSolidWallColumn(ctx, screenX, wallTop, wallBottom, hit.side);
    }
  }

  private renderTexturedWallColumn(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    wallTop: number,
    wallBottom: number,
    textureX: number,
    texture: HTMLImageElement,
    side: 'north' | 'south' | 'east' | 'west'
  ): void {
    const wallHeight = wallBottom - wallTop;
    
    // Apply shading based on wall side
    let brightness = 1.0;
    if (side === 'east' || side === 'west') {
      brightness = 0.8; // Darker for east/west walls
    }
    
    // Sample texture column
    const textureColumn = Math.floor(textureX * texture.width);
    
    // Draw textured wall column
    ctx.save();
    ctx.globalAlpha = brightness;
    ctx.drawImage(
      texture,
      textureColumn, 0, 1, texture.height, // Source
      screenX, wallTop, 1, wallHeight       // Destination
    );
    ctx.restore();
  }

  private renderSolidWallColumn(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    wallTop: number,
    wallBottom: number,
    side: 'north' | 'south' | 'east' | 'west'
  ): void {
    // Use different colors for different wall sides
    let color = '#808080'; // Default gray
    switch (side) {
      case 'north': color = '#A0A0A0'; break; // Light gray
      case 'south': color = '#606060'; break; // Dark gray
      case 'east': color = '#808080'; break;  // Medium gray
      case 'west': color = '#707070'; break;  // Slightly dark gray
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(screenX, wallTop, 1, wallBottom - wallTop);
  }

  private renderBillboards(
    ctx: CanvasRenderingContext2D,
    billboards: Billboard[],
    camera: RaycastCamera,
    viewport: { width: number; height: number },
    fov: number,
    rays: RayHit[]
  ): void {
    // Calculate billboard render data
    const billboardData = billboards
      .map(billboard => RaycastMath.calculateBillboard(billboard, camera, viewport, fov))
      .filter(data => data.visible)
      .sort((a, b) => b.distance - a.distance); // Sort back to front
    
    // Render each billboard
    for (const data of billboardData) {
      this.renderBillboard(ctx, data, viewport, rays);
    }
  }

  private renderBillboard(
    ctx: CanvasRenderingContext2D,
    data: BillboardRenderData,
    viewport: { width: number; height: number },
    rays: RayHit[]
  ): void {
    const texture = this.getTexture(data.billboard.texture);
    
    if (!texture) {
      // Render placeholder
      ctx.fillStyle = '#FF00FF'; // Magenta placeholder
      ctx.fillRect(
        data.screenX - data.screenSize / 2,
        viewport.height / 2 - data.screenSize / 2,
        data.screenSize,
        data.screenSize
      );
      return;
    }
    
    // Calculate billboard bounds
    const left = Math.floor(data.screenX - data.screenSize / 2);
    const right = Math.floor(data.screenX + data.screenSize / 2);
    const top = Math.floor(viewport.height / 2 - data.screenSize / 2);
    const bottom = Math.floor(viewport.height / 2 + data.screenSize / 2);
    
    // Render billboard with depth testing
    for (let x = Math.max(0, left); x < Math.min(viewport.width, right); x++) {
      // Check if this column is occluded by a wall
      if (x < rays.length && rays[x].wallType > 0 && rays[x].distance < data.distance) {
        continue; // Skip occluded pixels
      }
      
      const textureX = (x - left) / (right - left);
      
      // Draw vertical strip of billboard
      ctx.drawImage(
        texture,
        Math.floor(textureX * texture.width), 0, 1, texture.height, // Source
        x, top, 1, bottom - top                                      // Destination
      );
    }
  }

  private getTexture(textureId: string): HTMLImageElement | null {
    if (!textureId) return null;
    
    // Check cache first
    if (this.textureCache.has(textureId)) {
      return this.textureCache.get(textureId)!;
    }

    // For now, return null - in a full implementation, this would load the texture
    // TODO: Integrate with asset loading system
    return null;
  }
}

/**
 * Raycast module definition for registration
 */
export const RaycastModuleDefinition: ModuleDefinition = {
  name: 'raycast',
  nodeTypes: ['RaycastMap'],
  actions: ['setRaycastCamera', 'moveRaycastCamera'],
  triggers: ['on.raycastHit'],
  dependencies: [],
  size: 12 // Estimated KB
};

/**
 * Register the raycast module
 */
export function registerRaycastModule(): void {
  const registry = ModuleRegistry.getInstance();
  
  // Register module definition
  registry.registerModule(RaycastModuleDefinition);
  
  // Register render module
  const renderModule = new RaycastRenderModule();
  registry.registerRenderModule(renderModule);
  
  // Register action handlers
  registry.registerActionHandler('setRaycastCamera', (params: any) => {
    // TODO: Implement raycast camera action handler
    console.log('setRaycastCamera action:', params);
  });
  
  registry.registerActionHandler('moveRaycastCamera', (params: any) => {
    // TODO: Implement raycast camera movement action handler
    console.log('moveRaycastCamera action:', params);
  });
}