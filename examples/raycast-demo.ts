/**
 * Raycast rendering module demo
 * Demonstrates basic raycast rendering with walls and billboards
 */

import { registerRaycastModule } from '../src/modules/raycast.js';
import { ModuleRegistry } from '../src/core/module-registry.js';

// Register the raycast module
registerRaycastModule();

// Create a simple demo scene
const demoScene = {
  id: 'raycast-demo',
  root: {
    id: 'root',
    type: 'Group',
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible: true,
    children: [
      {
        id: 'raycast-map',
        type: 'RaycastMap',
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
        triggers: [
          {
            event: 'on.start',
            actions: [
              {
                type: 'setRaycastCamera',
                params: {
                  position: { x: 1.5, y: 1.5 },
                  rotation: 0,
                  height: 0.5,
                  pitch: 0
                }
              }
            ]
          },
          {
            event: 'on.key',
            actions: [
              {
                type: 'moveRaycastCamera',
                params: {
                  key: 'w',
                  deltaPosition: { x: 0, y: 0.1 }
                }
              },
              {
                type: 'moveRaycastCamera',
                params: {
                  key: 's',
                  deltaPosition: { x: 0, y: -0.1 }
                }
              },
              {
                type: 'moveRaycastCamera',
                params: {
                  key: 'a',
                  deltaRotation: -0.1
                }
              },
              {
                type: 'moveRaycastCamera',
                params: {
                  key: 'd',
                  deltaRotation: 0.1
                }
              }
            ]
          }
        ],
        // Raycast-specific properties
        map: [
          [1, 1, 1, 1, 1, 1, 1, 1],
          [1, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 2, 0, 0, 2, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 1],
          [1, 0, 0, 3, 3, 0, 0, 1],
          [1, 0, 2, 0, 0, 2, 0, 1],
          [1, 0, 0, 0, 0, 0, 0, 1],
          [1, 1, 1, 1, 1, 1, 1, 1]
        ],
        textures: ['wall-brick', 'wall-stone', 'wall-wood'],
        billboards: [
          {
            position: { x: 2.5, y: 2.5 },
            texture: 'barrel',
            scale: 1.0
          },
          {
            position: { x: 5.5, y: 2.5 },
            texture: 'barrel',
            scale: 1.0
          },
          {
            position: { x: 4.0, y: 5.5 },
            texture: 'pillar',
            scale: 1.5
          }
        ],
        fov: Math.PI / 3, // 60 degrees
        renderDistance: 15,
        tileSize: 1.0
      }
    ],
    actions: [],
    triggers: []
  }
};

// Demo function to show module capabilities
export function runRaycastDemo() {
  console.log('Raycast Module Demo');
  console.log('==================');
  
  const registry = ModuleRegistry.getInstance();
  
  // Check if module is registered
  const module = registry.getModule('raycast');
  if (module) {
    console.log('✓ Raycast module registered successfully');
    console.log(`  - Node types: ${module.nodeTypes.join(', ')}`);
    console.log(`  - Actions: ${module.actions.join(', ')}`);
    console.log(`  - Triggers: ${module.triggers.join(', ')}`);
    console.log(`  - Estimated size: ${module.size} KB`);
  } else {
    console.log('✗ Raycast module not registered');
    return;
  }
  
  // Check render module
  const renderModule = registry.getRenderModule('raycast');
  if (renderModule) {
    console.log('✓ Raycast render module available');
    console.log(`  - Supports node types: ${renderModule.nodeTypes.join(', ')}`);
  }
  
  // Test action handlers
  console.log('\nTesting action handlers:');
  
  const setCameraHandler = registry.getActionHandler('setRaycastCamera');
  if (setCameraHandler) {
    console.log('✓ setRaycastCamera handler available');
    setCameraHandler({
      position: { x: 1.5, y: 1.5 },
      rotation: 0,
      height: 0.5
    });
  }
  
  const moveCameraHandler = registry.getActionHandler('moveRaycastCamera');
  if (moveCameraHandler) {
    console.log('✓ moveRaycastCamera handler available');
    moveCameraHandler({
      deltaPosition: { x: 0.1, y: 0 },
      deltaRotation: 0.05
    });
  }
  
  // Show demo scene structure
  console.log('\nDemo scene structure:');
  console.log(`- Scene ID: ${demoScene.id}`);
  console.log(`- Root node: ${demoScene.root.type}`);
  console.log(`- Raycast map: ${demoScene.root.children[0].type}`);
  console.log(`- Map size: ${(demoScene.root.children[0] as any).map.length}x${(demoScene.root.children[0] as any).map[0].length}`);
  console.log(`- Textures: ${(demoScene.root.children[0] as any).textures.length}`);
  console.log(`- Billboards: ${(demoScene.root.children[0] as any).billboards.length}`);
  console.log(`- FOV: ${((demoScene.root.children[0] as any).fov * 180 / Math.PI).toFixed(1)}°`);
  console.log(`- Render distance: ${(demoScene.root.children[0] as any).renderDistance}`);
  
  console.log('\nDemo complete! The raycast module is ready for use.');
  console.log('Controls: W/S to move forward/back, A/D to turn left/right');
  
  return demoScene;
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRaycastDemo();
}