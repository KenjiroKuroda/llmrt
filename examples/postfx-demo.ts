/**
 * Post-processing effects demonstration
 * Shows vignette, bloom-lite, and color grading effects
 */

import { PostFXRenderModule, registerPostFXModule } from '../src/modules/postfx.js';
import { ModuleRegistry } from '../src/core/module-registry.js';
import { Renderer } from '../src/core/renderer.js';
import { Node, ThemeTokens } from '../src/types/core.js';

// Register the PostFX module
registerPostFXModule();

// Create theme
const theme: ThemeTokens = {
  colors: {
    primary: '#007ACC',
    secondary: '#FF6B35',
    background: '#1E1E1E',
    text: '#FFFFFF',
    accent: '#FFD700'
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

// Create canvas
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);

// Create renderer
const renderer = new Renderer(canvas, theme);

// Register PostFX module with renderer
const moduleRegistry = ModuleRegistry.getInstance();
const postfxModule = moduleRegistry.getRenderModule('postfx');
if (postfxModule) {
  renderer.registerModule(postfxModule);
}

// Create scene with various elements
const createSampleScene = (): Node[] => {
  // Create some basic nodes to show effects on
  const backgroundSprite: Node = {
    id: 'background',
    type: 'Sprite',
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
    spriteId: 'background-texture'
  } as any;

  const titleText: Node = {
    id: 'title',
    type: 'Text',
    transform: {
      position: { x: 0, y: -200 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible: true,
    children: [],
    actions: [],
    triggers: [],
    text: 'PostFX Demo',
    fontSize: 32
  } as any;

  const brightButton: Node = {
    id: 'bright-button',
    type: 'Button',
    transform: {
      position: { x: -100, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible: true,
    children: [],
    actions: [],
    triggers: [],
    text: 'Bright Button',
    fontSize: 16
  } as any;

  const normalButton: Node = {
    id: 'normal-button',
    type: 'Button',
    transform: {
      position: { x: 100, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible: true,
    children: [],
    actions: [],
    triggers: [],
    text: 'Normal Button',
    fontSize: 16
  } as any;

  // Add common node methods
  const addNodeMethods = (node: Node) => {
    node.addChild = () => {};
    node.removeChild = () => false;
    node.removeFromParent = () => false;
    node.getRoot = () => node;
    node.getDepth = () => 0;
    node.getWorldTransform = () => node.transform;
    node.isWorldVisible = () => node.visible;
  };

  [backgroundSprite, titleText, brightButton, normalButton].forEach(addNodeMethods);

  return [backgroundSprite, titleText, brightButton, normalButton];
};

// Create different PostFX configurations
const createVignetteEffect = (): Node => {
  const vignetteChain: Node = {
    id: 'vignette-chain',
    type: 'PostChain',
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
    effects: [
      PostFXRenderModule.createVignetteEffect({
        intensity: 0.7,
        radius: 0.2,
        softness: 0.8,
        color: '#000000'
      })
    ]
  } as any;

  vignetteChain.addChild = () => {};
  vignetteChain.removeChild = () => false;
  vignetteChain.removeFromParent = () => false;
  vignetteChain.getRoot = () => vignetteChain;
  vignetteChain.getDepth = () => 0;
  vignetteChain.getWorldTransform = () => vignetteChain.transform;
  vignetteChain.isWorldVisible = () => vignetteChain.visible;

  return vignetteChain;
};

const createBloomEffect = (): Node => {
  const bloomChain: Node = {
    id: 'bloom-chain',
    type: 'PostChain',
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
    effects: [
      PostFXRenderModule.createBloomLiteEffect({
        intensity: 0.5,
        threshold: 0.6,
        radius: 6,
        strength: 2.0
      })
    ]
  } as any;

  bloomChain.addChild = () => {};
  bloomChain.removeChild = () => false;
  bloomChain.removeFromParent = () => false;
  bloomChain.getRoot = () => bloomChain;
  bloomChain.getDepth = () => 0;
  bloomChain.getWorldTransform = () => bloomChain.transform;
  bloomChain.isWorldVisible = () => bloomChain.visible;

  return bloomChain;
};

const createColorGradingEffect = (): Node => {
  const colorGradingChain: Node = {
    id: 'color-grading-chain',
    type: 'PostChain',
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
    effects: [
      PostFXRenderModule.createColorGradingEffect({
        intensity: 0.8,
        brightness: 0.1,
        contrast: 0.2,
        saturation: 0.3,
        hue: 15,
        gamma: 1.2
      })
    ]
  } as any;

  colorGradingChain.addChild = () => {};
  colorGradingChain.removeChild = () => false;
  colorGradingChain.removeFromParent = () => false;
  colorGradingChain.getRoot = () => colorGradingChain;
  colorGradingChain.getDepth = () => 0;
  colorGradingChain.getWorldTransform = () => colorGradingChain.transform;
  colorGradingChain.isWorldVisible = () => colorGradingChain.visible;

  return colorGradingChain;
};

const createCombinedEffects = (): Node => {
  const combinedChain: Node = {
    id: 'combined-chain',
    type: 'PostChain',
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
    effects: [
      PostFXRenderModule.createBloomLiteEffect({
        intensity: 0.3,
        threshold: 0.7,
        radius: 4,
        strength: 1.5
      }),
      PostFXRenderModule.createColorGradingEffect({
        intensity: 0.6,
        brightness: 0.05,
        contrast: 0.1,
        saturation: 0.2,
        hue: 10,
        gamma: 1.1
      }),
      PostFXRenderModule.createVignetteEffect({
        intensity: 0.4,
        radius: 0.3,
        softness: 0.6,
        color: '#000033'
      })
    ]
  } as any;

  combinedChain.addChild = () => {};
  combinedChain.removeChild = () => false;
  combinedChain.removeFromParent = () => false;
  combinedChain.getRoot = () => combinedChain;
  combinedChain.getDepth = () => 0;
  combinedChain.getWorldTransform = () => combinedChain.transform;
  combinedChain.isWorldVisible = () => combinedChain.visible;

  return combinedChain;
};

// Demo states
let currentDemo = 0;
const demos = [
  { name: 'No Effects', effects: [] },
  { name: 'Vignette', effects: [createVignetteEffect()] },
  { name: 'Bloom', effects: [createBloomEffect()] },
  { name: 'Color Grading', effects: [createColorGradingEffect()] },
  { name: 'Combined Effects', effects: [createCombinedEffects()] }
];

// Render function
const render = () => {
  const scene = createSampleScene();
  const currentEffects = demos[currentDemo].effects;
  const fullScene = [...scene, ...currentEffects];
  
  renderer.render(fullScene, 0);
  
  // Draw demo info
  const ctx = canvas.getContext('2d')!;
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Demo: ${demos[currentDemo].name}`, 10, 30);
  ctx.fillText('Press SPACE to cycle through effects', 10, 50);
  ctx.restore();
};

// Input handling
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    currentDemo = (currentDemo + 1) % demos.length;
    render();
  }
});

// Initial render
render();

console.log('PostFX Demo loaded! Press SPACE to cycle through different effects.');
console.log('Available effects:', demos.map(d => d.name).join(', '));