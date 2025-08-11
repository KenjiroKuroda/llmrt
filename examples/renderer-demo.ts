/**
 * Renderer demonstration showing canvas rendering system
 */

import { Renderer } from '../src/core/renderer.js';
import { NodeFactory, SceneTree } from '../src/core/scene-tree.js';
import { ThemeTokens } from '../src/types/core.js';

// Example theme
const demoTheme: ThemeTokens = {
  colors: {
    primary: '#007acc',
    secondary: '#f0f0f0',
    background: '#ffffff',
    text: '#333333',
    accent: '#ff6b35'
  },
  font: {
    family: 'Arial, sans-serif',
    sizes: {
      small: 12,
      medium: 16,
      large: 24
    }
  },
  spacing: {
    small: 4,
    medium: 8,
    large: 16
  },
  radii: {
    small: 4,
    medium: 8,
    large: 16
  }
};

/**
 * Create a demo scene with various node types
 */
function createDemoScene() {
  const root = NodeFactory.createGroup('root');
  
  // Create a sprite
  const sprite = NodeFactory.createSprite('player-sprite');
  sprite.transform.position = { x: 100, y: 100 };
  sprite.transform.scale = { x: 1.5, y: 1.5 };
  root.addChild(sprite);
  
  // Create text
  const titleText = NodeFactory.createText('title', 'LLM Canvas Engine');
  titleText.transform.position = { x: 200, y: 50 };
  (titleText as any).fontSize = 24;
  root.addChild(titleText);
  
  // Create a button
  const button = NodeFactory.createButton('start-button', 'Start Game');
  button.transform.position = { x: 200, y: 200 };
  root.addChild(button);
  
  // Create a group with child nodes
  const group = NodeFactory.createGroup('ui-group');
  group.transform.position = { x: 300, y: 150 };
  
  const healthText = NodeFactory.createText('health', 'Health: 100');
  healthText.transform.position = { x: 0, y: 0 };
  group.addChild(healthText);
  
  const scoreText = NodeFactory.createText('score', 'Score: 0');
  scoreText.transform.position = { x: 0, y: 30 };
  group.addChild(scoreText);
  
  root.addChild(group);
  
  return new SceneTree(root);
}

/**
 * Demo function showing renderer usage
 */
export function runRendererDemo() {
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  
  // Create renderer
  const renderer = new Renderer(canvas, demoTheme);
  
  // Create demo scene
  const sceneTree = createDemoScene();
  
  // Get visible nodes for rendering
  const visibleNodes = sceneTree.getVisibleNodes();
  
  // Render the scene
  renderer.render(visibleNodes, 0);
  
  console.log('Renderer demo completed successfully!');
  console.log(`Rendered ${visibleNodes.length} nodes`);
  
  // Demonstrate camera controls
  renderer.setCamera({ 
    position: { x: 50, y: 25 }, 
    zoom: 1.2 
  });
  
  // Render again with camera transform
  renderer.render(visibleNodes, 0);
  
  console.log('Camera transform applied');
  
  // Demonstrate theme updates
  const darkTheme: ThemeTokens = {
    ...demoTheme,
    colors: {
      ...demoTheme.colors,
      background: '#1a1a1a',
      text: '#ffffff'
    }
  };
  
  renderer.setTheme(darkTheme);
  renderer.render(visibleNodes, 0);
  
  console.log('Dark theme applied');
  
  return {
    canvas,
    renderer,
    sceneTree
  };
}

// Export for use in other examples
export { demoTheme, createDemoScene };