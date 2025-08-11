/**
 * Isometric tilemap demo
 * Demonstrates the isometric rendering module capabilities
 */

import { registerIsoModule, IsoMath } from '../src/modules/iso.js';
import { TilemapIsoNode } from '../src/types/modules.js';

// Register the isometric module
registerIsoModule();

// Example isometric tilemap data
const exampleMap = [
  [1, 2, 3, 2, 1],
  [2, 0, 0, 0, 2],
  [3, 0, 4, 0, 3],
  [2, 0, 0, 0, 2],
  [1, 2, 3, 2, 1]
];

const exampleElevation = [
  [0, 1, 2, 1, 0],
  [1, 0, 0, 0, 1],
  [2, 0, 3, 0, 2],
  [1, 0, 0, 0, 1],
  [0, 1, 2, 1, 0]
];

// Create an example isometric tilemap node
const isoMapNode: TilemapIsoNode = {
  id: 'dungeon-map',
  type: 'TilemapIso',
  transform: {
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    skew: { x: 0, y: 0 },
    alpha: 1
  },
  visible: true,
  children: [],
  actions: [
    {
      type: 'setIsoCamera',
      params: {
        position: { x: 0, y: 0 },
        zoom: 1.0,
        offset: { x: 400, y: 300 }
      },
      conditions: []
    }
  ],
  triggers: [
    {
      event: 'on.start',
      actions: [
        {
          type: 'setIsoCamera',
          params: {
            position: { x: 0, y: 0 },
            zoom: 1.0,
            offset: { x: 400, y: 300 }
          },
          conditions: []
        }
      ]
    },
    {
      event: 'on.tileClick',
      actions: [
        {
          type: 'setTileElevation',
          params: {
            tileX: '${clickedTileX}',
            tileY: '${clickedTileY}',
            elevation: 1
          },
          conditions: []
        }
      ]
    }
  ],
  tileset: 'dungeon-tileset',
  map: exampleMap,
  tileSize: { x: 64, y: 32 },
  elevation: exampleElevation,
  tilesetColumns: 4,
  tilesetRows: 2,
  
  // Node interface methods (would be implemented by the engine)
  addChild: () => {},
  removeChild: () => false,
  removeFromParent: () => false,
  getRoot: () => isoMapNode,
  getDepth: () => 0,
  getWorldTransform: () => isoMapNode.transform,
  isWorldVisible: () => true
};

// Example usage of isometric math utilities
console.log('=== Isometric Tilemap Demo ===');

// Convert tile coordinates to screen coordinates
const tilePos = { x: 2, y: 2 };
const screenPos = IsoMath.tileToIso(tilePos.x, tilePos.y, { x: 64, y: 32 }, 3);
console.log(`Tile (${tilePos.x}, ${tilePos.y}) with elevation 3 -> Screen (${screenPos.x}, ${screenPos.y})`);

// Convert screen coordinates back to tile coordinates
const camera = IsoMath.createDefaultCamera();
camera.offset = { x: 400, y: 300 };
const backToTile = IsoMath.screenToTile(screenPos.x + 400, screenPos.y + 300, camera, { x: 64, y: 32 });
console.log(`Screen (${screenPos.x + 400}, ${screenPos.y + 300}) -> Tile (${Math.floor(backToTile.x)}, ${Math.floor(backToTile.y)})`);

// Test collision detection
const collision = IsoMath.getTileCollision(2.5, 2.5, exampleMap, exampleElevation, { x: 64, y: 32 });
if (collision) {
  console.log(`Collision at (2.5, 2.5): Tile ${collision.tileIndex}, Elevation ${collision.elevation}`);
} else {
  console.log('No collision at (2.5, 2.5)');
}

// Test point-in-tile detection
const pointInTile = IsoMath.isPointInTile(screenPos.x, screenPos.y, tilePos.x, tilePos.y, { x: 64, y: 32 }, 3);
console.log(`Point (${screenPos.x}, ${screenPos.y}) is ${pointInTile ? 'inside' : 'outside'} tile (${tilePos.x}, ${tilePos.y})`);

// Calculate visible tiles for a viewport
const viewport = { width: 800, height: 600 };
const visibleTiles = IsoMath.getVisibleTiles(camera, viewport, { x: 64, y: 32 }, 5, 5);
console.log(`Visible tiles: X(${visibleTiles.startX}-${visibleTiles.endX}), Y(${visibleTiles.startY}-${visibleTiles.endY})`);

// Calculate render order
const renderOrder = IsoMath.calculateRenderOrder(
  visibleTiles.startX, 
  visibleTiles.endX, 
  visibleTiles.startY, 
  visibleTiles.endY
);
console.log(`Render order for ${renderOrder.length} tiles:`, renderOrder.slice(0, 5).map(t => `(${t.x},${t.y})`).join(', '), '...');

// Example LGF cartridge snippet for isometric tilemap
const lgfSnippet = {
  version: "1.0",
  metadata: {
    title: "Isometric Dungeon",
    author: "Demo",
    description: "Example isometric tilemap game"
  },
  theme: {
    colors: {
      primary: "#8B4513",
      secondary: "#D2691E", 
      background: "#2F4F2F",
      text: "#FFFFFF",
      accent: "#FFD700"
    },
    font: {
      family: "Arial",
      sizes: { small: 12, medium: 16, large: 24 }
    },
    spacing: { small: 4, medium: 8, large: 16 },
    radii: { small: 2, medium: 4, large: 8 }
  },
  scenes: [
    {
      id: "dungeon",
      root: isoMapNode
    }
  ],
  assets: {
    sprites: [
      {
        id: "dungeon-tileset",
        url: "assets/dungeon-tiles.png",
        width: 256,
        height: 64,
        frames: 1
      }
    ],
    audio: [],
    fonts: []
  },
  variables: {
    playerX: 2,
    playerY: 2,
    cameraFollowPlayer: true
  }
};

console.log('\n=== Example LGF Cartridge Structure ===');
console.log('Scene root node type:', lgfSnippet.scenes[0].root.type);
console.log('Map dimensions:', `${exampleMap[0].length}x${exampleMap.length}`);
console.log('Tile size:', lgfSnippet.scenes[0].root.tileSize);
console.log('Has elevation data:', lgfSnippet.scenes[0].root.elevation.length > 0);

export { isoMapNode, lgfSnippet };