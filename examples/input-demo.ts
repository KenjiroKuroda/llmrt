/**
 * Input Management System Demo
 * Demonstrates how to use the InputManager for keyboard and pointer input
 */

import { createEngine, InputManagerImpl, InputIntegration } from '../src/index.js';
import { ActionSystem } from '../src/core/action-system.js';
import { TriggerSystem } from '../src/core/trigger-system.js';

// Create a demo that shows input management capabilities
function createInputDemo() {
  // Create engine and get input manager
  const engine = createEngine();
  const inputManager = engine.getInputManager();

  // Create a canvas element for the demo
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '1px solid #ccc';
  document.body.appendChild(canvas);

  // Initialize input manager with canvas
  inputManager.initialize(canvas);

  // Set up input mappings
  setupInputMappings(inputManager);

  // Create integration with trigger system
  const actionSystem = new ActionSystem();
  const triggerSystem = new TriggerSystem(actionSystem);
  const inputIntegration = new InputIntegration(inputManager, triggerSystem);
  
  // Setup default mappings for accessibility
  inputIntegration.setupDefaultMappings();

  // Create demo state
  const demoState = {
    playerPosition: { x: 400, y: 300 },
    pointerPosition: { x: 0, y: 0 },
    pressedActions: new Set<string>(),
    lastAction: 'none'
  };

  // Game loop
  function update() {
    // Update input manager
    inputManager.update();

    // Update demo state based on input
    updateDemoState(inputManager, demoState);

    // Render demo
    renderDemo(canvas, demoState);

    // Continue loop
    requestAnimationFrame(update);
  }

  // Start the demo
  update();

  // Add instructions
  addInstructions();

  return {
    cleanup: () => {
      inputManager.cleanup();
      document.body.removeChild(canvas);
    }
  };
}

function setupInputMappings(inputManager: any) {
  // Movement keys
  inputManager.mapKey('w', 'move-up');
  inputManager.mapKey('a', 'move-left');
  inputManager.mapKey('s', 'move-down');
  inputManager.mapKey('d', 'move-right');
  
  // Arrow keys for movement too
  inputManager.mapKey('up', 'move-up');
  inputManager.mapKey('down', 'move-down');
  inputManager.mapKey('left', 'move-left');
  inputManager.mapKey('right', 'move-right');

  // Action keys
  inputManager.mapKey('space', 'jump');
  inputManager.mapKey('enter', 'confirm');
  inputManager.mapKey('escape', 'cancel');

  // Pointer mappings
  inputManager.mapPointer(0, 'primary-click');
  inputManager.mapPointer(2, 'secondary-click');
}

function updateDemoState(inputManager: any, state: any) {
  const moveSpeed = 3;

  // Update player position based on movement input
  if (inputManager.isActionPressed('move-up')) {
    state.playerPosition.y -= moveSpeed;
    state.lastAction = 'move-up';
  }
  if (inputManager.isActionPressed('move-down')) {
    state.playerPosition.y += moveSpeed;
    state.lastAction = 'move-down';
  }
  if (inputManager.isActionPressed('move-left')) {
    state.playerPosition.x -= moveSpeed;
    state.lastAction = 'move-left';
  }
  if (inputManager.isActionPressed('move-right')) {
    state.playerPosition.x += moveSpeed;
    state.lastAction = 'move-right';
  }

  // Keep player in bounds
  state.playerPosition.x = Math.max(20, Math.min(780, state.playerPosition.x));
  state.playerPosition.y = Math.max(20, Math.min(580, state.playerPosition.y));

  // Update pointer position
  state.pointerPosition = inputManager.getPointerPosition();

  // Track pressed actions
  state.pressedActions.clear();
  const actionsToCheck = [
    'move-up', 'move-down', 'move-left', 'move-right',
    'jump', 'confirm', 'cancel', 'primary-click', 'secondary-click'
  ];

  for (const action of actionsToCheck) {
    if (inputManager.isActionPressed(action)) {
      state.pressedActions.add(action);
    }
  }

  // Check for just-pressed actions
  if (inputManager.isActionJustPressed('jump')) {
    state.lastAction = 'jump (just pressed)';
  }
  if (inputManager.isActionJustPressed('primary-click')) {
    state.lastAction = 'primary-click (just pressed)';
  }
  if (inputManager.isActionJustPressed('secondary-click')) {
    state.lastAction = 'secondary-click (just pressed)';
  }
}

function renderDemo(canvas: HTMLCanvasElement, state: any) {
  const ctx = canvas.getContext('2d')!;
  
  // Clear canvas
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(state.playerPosition.x, state.playerPosition.y, 20, 0, Math.PI * 2);
  ctx.fill();

  // Draw pointer position
  ctx.fillStyle = '#FF5722';
  ctx.beginPath();
  ctx.arc(state.pointerPosition.x, state.pointerPosition.y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Draw line from player to pointer
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.playerPosition.x, state.playerPosition.y);
  ctx.lineTo(state.pointerPosition.x, state.pointerPosition.y);
  ctx.stroke();

  // Draw UI text
  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.fillText(`Player: (${Math.round(state.playerPosition.x)}, ${Math.round(state.playerPosition.y)})`, 10, 30);
  ctx.fillText(`Pointer: (${Math.round(state.pointerPosition.x)}, ${Math.round(state.pointerPosition.y)})`, 10, 50);
  ctx.fillText(`Last Action: ${state.lastAction}`, 10, 70);
  
  // Draw pressed actions
  const pressedList = Array.from(state.pressedActions).join(', ');
  ctx.fillText(`Pressed: ${pressedList || 'none'}`, 10, 90);
}

function addInstructions() {
  const instructions = document.createElement('div');
  instructions.style.marginTop = '20px';
  instructions.style.fontFamily = 'Arial, sans-serif';
  instructions.innerHTML = `
    <h3>Input Manager Demo Instructions:</h3>
    <ul>
      <li><strong>WASD or Arrow Keys:</strong> Move the green circle</li>
      <li><strong>Space:</strong> Jump action</li>
      <li><strong>Enter:</strong> Confirm action</li>
      <li><strong>Escape:</strong> Cancel action</li>
      <li><strong>Mouse:</strong> Move pointer (red dot), left/right click for actions</li>
      <li><strong>Tab:</strong> Focus navigation (accessibility)</li>
    </ul>
    <p>The demo shows real-time input state tracking, action mapping, and pointer position.</p>
  `;
  document.body.appendChild(instructions);
}

// Export for use in browser
if (typeof window !== 'undefined') {
  (window as any).createInputDemo = createInputDemo;
}

export { createInputDemo };