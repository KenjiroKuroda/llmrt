/**
 * Demo showing the Action and Trigger system in action
 */

import { ActionSystem, TriggerSystem, ActionContext } from '../src/core/action-system.js';
import { Node, LGFCartridge, Transform2D } from '../src/types/core.js';
import { Trigger, Action } from '../src/types/actions.js';
import { GameLoop } from '../src/core/game-loop.js';

// Create a simple demo cartridge
const demoCartridge: LGFCartridge = {
  version: '1.0',
  metadata: {
    title: 'Action/Trigger Demo',
    author: 'LLM Canvas Engine',
    description: 'Demonstrates the action and trigger system'
  },
  theme: {
    colors: {
      primary: '#4A90E2',
      secondary: '#7ED321',
      background: '#F5F5F5',
      text: '#333333',
      accent: '#D0021B'
    },
    font: {
      family: 'Arial, sans-serif',
      sizes: { small: 12, medium: 16, large: 24 }
    },
    spacing: { small: 4, medium: 8, large: 16 },
    radii: { small: 2, medium: 4, large: 8 }
  },
  scenes: [],
  assets: {
    sprites: [],
    audio: [],
    fonts: []
  },
  variables: {
    score: 0,
    lives: 3,
    gameStarted: false
  }
};

// Create a simple node implementation
class SimpleNode implements Node {
  id: string;
  type: any;
  transform: Transform2D;
  visible: boolean;
  children: Node[] = [];
  actions: Action[] = [];
  triggers: Trigger[] = [];

  constructor(id: string, type: string = 'Group') {
    this.id = id;
    this.type = type as any;
    this.transform = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    };
    this.visible = true;
  }

  addChild(child: Node): void {
    this.children.push(child);
  }

  removeChild(child: Node): boolean {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      return true;
    }
    return false;
  }

  removeFromParent(): boolean {
    // Simplified implementation
    return true;
  }

  getRoot(): Node {
    return this;
  }

  getDepth(): number {
    return 0;
  }

  getWorldTransform(): Transform2D {
    return this.transform;
  }

  isWorldVisible(): boolean {
    return this.visible;
  }
}

// Demo function
export function runActionTriggerDemo() {
  console.log('🎮 Starting Action/Trigger System Demo');

  // Create systems
  const gameLoop = new GameLoop();
  const actionSystem = new ActionSystem();
  const triggerSystem = new TriggerSystem(actionSystem);
  
  // Create game variables
  const variables = new Map<string, any>();
  variables.set('score', 0);
  variables.set('lives', 3);
  variables.set('gameStarted', false);

  // Create context
  const context: ActionContext = {
    node: new SimpleNode('demo'),
    cartridge: demoCartridge,
    gameLoop,
    variables,
    currentScene: 'demo-scene',
    sceneNodes: new Map()
  };

  // Create a player node with various triggers
  const player = new SimpleNode('player', 'Sprite');
  player.transform.position = { x: 100, y: 100 };

  // Add start trigger - initialize game
  player.triggers.push({
    event: 'on.start',
    actions: [
      { type: 'setVar', params: { variable: 'gameStarted', value: true } },
      { type: 'setVar', params: { variable: 'startTime', value: Date.now() } }
    ]
  });

  // Add tick trigger - update score over time
  player.triggers.push({
    event: 'on.tick',
    actions: [
      {
        type: 'if',
        params: {
          condition: { type: 'equals', variable: 'gameStarted', value: true },
          then: [
            { type: 'incVar', params: { variable: 'score', amount: 1 } }
          ]
        }
      }
    ]
  });

  // Add key trigger - jump action
  player.triggers.push({
    event: 'on.key',
    actions: [
      {
        type: 'if',
        params: {
          condition: { type: 'greater', variable: 'lives', value: 0 },
          then: [
            { type: 'setVar', params: { variable: 'isJumping', value: true } },
            {
              type: 'tween',
              params: {
                target: player,
                property: 'transform.position.y',
                to: 50,
                duration: 500,
                easing: 'easeOut'
              }
            },
            {
              type: 'startTimer',
              params: {
                id: 'jump-timer',
                duration: 1000,
                actions: [
                  { type: 'setVar', params: { variable: 'isJumping', value: false } },
                  {
                    type: 'tween',
                    params: {
                      target: player,
                      property: 'transform.position.y',
                      to: 100,
                      duration: 500,
                      easing: 'easeIn'
                    }
                  }
                ]
              }
            }
          ],
          else: [
            { type: 'setVar', params: { variable: 'gameOver', value: true } }
          ]
        }
      }
    ]
  });

  // Register the player node
  triggerSystem.registerNode(player, context);

  console.log('✅ Player node registered with triggers');
  console.log(`📊 Initial state: score=${variables.get('score')}, lives=${variables.get('lives')}, gameStarted=${variables.get('gameStarted')}`);

  // Simulate some game ticks
  console.log('\n🔄 Simulating game ticks...');
  for (let i = 0; i < 5; i++) {
    triggerSystem.processTick(context);
    actionSystem.update(16.67); // ~60 FPS
    
    if (i === 2) {
      console.log(`📊 After ${i + 1} ticks: score=${variables.get('score')}, gameStarted=${variables.get('gameStarted')}`);
    }
  }

  console.log(`📊 After 5 ticks: score=${variables.get('score')}`);

  // Simulate key input
  console.log('\n⌨️  Simulating space key press (jump)...');
  triggerSystem.handleInput({
    type: 'key',
    key: 'space',
    pressed: true
  }, context);

  console.log(`🦘 Jump triggered: isJumping=${variables.get('isJumping')}`);
  console.log(`📍 Player Y position: ${player.transform.position.y}`);

  // Simulate tween animation
  console.log('\n🎬 Simulating jump animation...');
  actionSystem.update(250); // Quarter of jump duration
  console.log(`📍 Player Y position (25% jump): ${player.transform.position.y.toFixed(1)}`);

  actionSystem.update(250); // Half of jump duration
  console.log(`📍 Player Y position (50% jump): ${player.transform.position.y.toFixed(1)}`);

  actionSystem.update(500); // Complete jump timer
  console.log(`🦘 Jump timer completed: isJumping=${variables.get('isJumping')}`);

  actionSystem.update(500); // Complete landing animation
  console.log(`📍 Player Y position (landed): ${player.transform.position.y.toFixed(1)}`);

  // Test conditional logic
  console.log('\n💀 Testing game over condition...');
  variables.set('lives', 0);
  
  // Release and press key again to trigger game over
  triggerSystem.handleInput({
    type: 'key',
    key: 'space',
    pressed: false
  }, context);
  
  triggerSystem.handleInput({
    type: 'key',
    key: 'space',
    pressed: true
  }, context);

  console.log(`💀 Game over: ${variables.get('gameOver')}`);

  console.log('\n🎉 Action/Trigger System Demo Complete!');
  console.log('✨ Successfully demonstrated:');
  console.log('  - on.start triggers');
  console.log('  - on.tick triggers with conditions');
  console.log('  - on.key triggers with complex logic');
  console.log('  - Tween animations');
  console.log('  - Timer actions');
  console.log('  - Conditional execution (if/then/else)');
  console.log('  - Variable manipulation (setVar, incVar)');
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runActionTriggerDemo();
}