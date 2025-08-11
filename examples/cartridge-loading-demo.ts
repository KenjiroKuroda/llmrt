/**
 * Cartridge Loading Demo
 * Demonstrates the cartridge loading and asset management system
 */

import { createEngine, CartridgeLoadProgress } from '../src/index.js';

// Sample cartridge JSON
const sampleCartridge = {
  version: '1.0',
  metadata: {
    title: 'Asset Loading Demo',
    author: 'LLMRT Engine',
    description: 'Demonstrates cartridge loading with assets'
  },
  theme: {
    colors: {
      primary: '#FF6B6B',
      secondary: '#4ECDC4',
      background: '#45B7D1',
      text: '#FFFFFF',
      accent: '#FFA07A'
    },
    font: {
      family: 'Arial, sans-serif',
      sizes: { small: 12, medium: 16, large: 24 }
    },
    spacing: { small: 4, medium: 8, large: 16 },
    radii: { small: 2, medium: 4, large: 8 }
  },
  scenes: [
    {
      id: 'main',
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
            id: 'player',
            type: 'Sprite',
            transform: {
              position: { x: 100, y: 100 },
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
                    type: 'playSfx',
                    params: { id: 'start-sound' }
                  }
                ]
              }
            ]
          }
        ],
        actions: [],
        triggers: []
      }
    }
  ],
  assets: {
    sprites: [
      {
        id: 'player',
        url: 'https://via.placeholder.com/32x32/FF6B6B/FFFFFF?text=P',
        width: 32,
        height: 32,
        frames: 1
      },
      {
        id: 'background',
        url: 'https://via.placeholder.com/800x600/45B7D1/FFFFFF?text=BG',
        width: 800,
        height: 600
      }
    ],
    audio: [
      {
        id: 'start-sound',
        url: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
        type: 'sfx'
      }
    ],
    fonts: [
      {
        id: 'game-font',
        family: 'Arial',
        url: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'
      }
    ]
  },
  variables: {
    score: 0,
    lives: 3
  }
};

async function runDemo() {
  console.log('🎮 Cartridge Loading Demo');
  console.log('========================');

  try {
    // Create engine instance
    const engine = createEngine();
    console.log('✅ Engine created');

    // Load cartridge with progress tracking
    console.log('\n📦 Loading cartridge...');
    
    await engine.loadCartridgeFromJSON(JSON.stringify(sampleCartridge), {
      onProgress: (progress: CartridgeLoadProgress) => {
        const percentage = Math.round(progress.progress * 100);
        console.log(`   ${progress.stage}: ${percentage}% - ${progress.message}`);
        
        if (progress.assetProgress) {
          const assetPercentage = Math.round(progress.assetProgress.progress * 100);
          console.log(`   Assets: ${assetPercentage}% (${progress.assetProgress.loaded}/${progress.assetProgress.total} loaded, ${progress.assetProgress.failed} failed)`);
        }
      }
    });

    console.log('✅ Cartridge loaded successfully');

    // Get asset manager and check loaded assets
    const assetManager = engine.getAssetManager();
    console.log('\n🖼️  Asset Status:');
    console.log(`   Player sprite loaded: ${assetManager.isAssetLoaded('player', 'sprite')}`);
    console.log(`   Background sprite loaded: ${assetManager.isAssetLoaded('background', 'sprite')}`);
    console.log(`   Game font loaded: ${assetManager.isAssetLoaded('game-font', 'font')}`);

    // Get memory usage
    const memoryUsage = engine.getCartridgeLoader().getMemoryUsage();
    console.log('\n💾 Memory Usage:');
    console.log(`   Sprites: ${Math.round(memoryUsage.assets.sprites / 1024)} KB`);
    console.log(`   Fonts: ${Math.round(memoryUsage.assets.fonts / 1024)} KB`);
    console.log(`   Total: ${Math.round(memoryUsage.total / 1024)} KB`);

    // Test asset retrieval with fallbacks
    console.log('\n🔄 Testing Asset Retrieval:');
    const playerSprite = assetManager.getSpriteWithFallback('player');
    const missingSprite = assetManager.getSpriteWithFallback('nonexistent');
    const gameFont = assetManager.getFontWithFallback('game-font');
    const missingFont = assetManager.getFontWithFallback('nonexistent');
    
    console.log(`   Player sprite: ${playerSprite ? 'Retrieved' : 'Failed'}`);
    console.log(`   Missing sprite: ${missingSprite ? 'Fallback provided' : 'Failed'}`);
    console.log(`   Game font: ${gameFont}`);
    console.log(`   Missing font: ${missingFont}`);

    // Get engine state
    const state = engine.getState();
    console.log('\n🎯 Engine State:');
    console.log(`   Current scene: ${state.currentScene}`);
    console.log(`   Running: ${state.running}`);

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo().catch(console.error);