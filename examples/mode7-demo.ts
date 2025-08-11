/**
 * Mode-7 rendering demonstration
 * Shows how to create a simple racing game effect using the Mode-7 module
 */

import { registerMode7Module } from '../src/modules/mode7.js';
import { Renderer } from '../src/core/renderer.js';
import { GameLoop } from '../src/core/game-loop.js';

// Register the Mode-7 module
registerMode7Module();

// Create demo scene with Mode-7 plane
const demoScene = {
  id: 'mode7-demo',
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
        id: 'ground-plane',
        type: 'Mode7Plane',
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
        triggers: [],
        // Mode-7 specific properties
        texture: 'road-texture',
        horizon: 0.4,           // Horizon at 40% from top
        scale: 2.0,             // 2x texture scale
        offset: { x: 0, y: 0 }, // Starting offset
        textureWidth: 256,
        textureHeight: 256
      },
      {
        id: 'ui-text',
        type: 'Text',
        transform: {
          position: { x: 0, y: -250 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          skew: { x: 0, y: 0 },
          alpha: 1
        },
        visible: true,
        children: [],
        actions: [],
        triggers: [],
        text: 'Mode-7 Racing Demo',
        fontSize: 24
      }
    ],
    actions: [],
    triggers: []
  }
};

// Demo theme
const demoTheme = {
  colors: {
    primary: '#FF6B35',
    secondary: '#004E89',
    background: '#87CEEB',
    text: '#FFFFFF',
    accent: '#FFD23F'
  },
  font: {
    family: 'Arial, sans-serif',
    sizes: {
      small: 12,
      medium: 16,
      large: 24,
      xlarge: 32
    }
  },
  spacing: {
    small: 4,
    medium: 8,
    large: 16,
    xlarge: 32
  },
  radii: {
    small: 4,
    medium: 8,
    large: 16
  }
};

// Initialize demo
function initMode7Demo() {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '2px solid #333';
  canvas.style.display = 'block';
  canvas.style.margin = '20px auto';
  
  // Add to page
  document.body.appendChild(canvas);
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Mode-7 Rendering Demo';
  title.style.textAlign = 'center';
  title.style.fontFamily = 'Arial, sans-serif';
  document.body.insertBefore(title, canvas);
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.innerHTML = `
    <p style="text-align: center; font-family: Arial, sans-serif; margin: 10px;">
      <strong>Controls:</strong><br>
      Arrow Keys: Move camera<br>
      A/D: Rotate camera<br>
      W/S: Change camera height<br>
      Q/E: Adjust horizon line
    </p>
  `;
  document.body.appendChild(instructions);
  
  // Create renderer
  const renderer = new Renderer(canvas, demoTheme);
  
  // Create game loop
  const gameLoop = new GameLoop();
  
  // Demo state
  let cameraX = 0;
  let cameraY = 0;
  let cameraRotation = 0;
  let cameraHeight = 100;
  let horizon = 0.4;
  let textureOffsetY = 0;
  
  // Input handling
  const keys = new Set<string>();
  
  document.addEventListener('keydown', (e) => {
    keys.add(e.code);
  });
  
  document.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
  
  // Update function
  gameLoop.onTick(() => {
    const speed = 2;
    const rotSpeed = 0.02;
    const heightSpeed = 1;
    const horizonSpeed = 0.005;
    
    // Handle input
    if (keys.has('ArrowUp')) {
      cameraY += speed * Math.cos(cameraRotation);
      cameraX += speed * Math.sin(cameraRotation);
      textureOffsetY += speed;
    }
    if (keys.has('ArrowDown')) {
      cameraY -= speed * Math.cos(cameraRotation);
      cameraX -= speed * Math.sin(cameraRotation);
      textureOffsetY -= speed;
    }
    if (keys.has('ArrowLeft')) {
      cameraX -= speed * Math.cos(cameraRotation + Math.PI / 2);
      cameraY -= speed * Math.sin(cameraRotation + Math.PI / 2);
    }
    if (keys.has('ArrowRight')) {
      cameraX += speed * Math.cos(cameraRotation + Math.PI / 2);
      cameraY += speed * Math.sin(cameraRotation + Math.PI / 2);
    }
    if (keys.has('KeyA')) {
      cameraRotation -= rotSpeed;
    }
    if (keys.has('KeyD')) {
      cameraRotation += rotSpeed;
    }
    if (keys.has('KeyW')) {
      cameraHeight = Math.min(200, cameraHeight + heightSpeed);
    }
    if (keys.has('KeyS')) {
      cameraHeight = Math.max(50, cameraHeight - heightSpeed);
    }
    if (keys.has('KeyQ')) {
      horizon = Math.max(0.1, horizon - horizonSpeed);
    }
    if (keys.has('KeyE')) {
      horizon = Math.min(0.9, horizon + horizonSpeed);
    }
    
    // Update scene with new parameters
    const groundPlane = demoScene.root.children[0] as any;
    groundPlane.horizon = horizon;
    groundPlane.offset = { x: 0, y: textureOffsetY };
    
    // Update UI text with current values
    const uiText = demoScene.root.children[1] as any;
    uiText.text = `Mode-7 Demo | Height: ${Math.round(cameraHeight)} | Horizon: ${horizon.toFixed(2)}`;
  });
  
  // Render function
  gameLoop.onRender((interpolation) => {
    // Set Mode-7 camera in render context
    const mode7Camera = {
      position: { x: cameraX, y: cameraY },
      rotation: cameraRotation,
      height: cameraHeight,
      pitch: Math.PI / 6, // 30 degrees
      fov: Math.PI / 3    // 60 degrees
    };
    
    // Add Mode-7 camera to render context
    (renderer as any).mode7Camera = mode7Camera;
    
    // Render scene
    renderer.render([demoScene.root], interpolation);
  });
  
  // Start demo
  gameLoop.start();
  
  // Cleanup function
  return () => {
    gameLoop.stop();
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('keyup', () => {});
  };
}

// Auto-start demo if running in browser
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initMode7Demo);
}

export { initMode7Demo };