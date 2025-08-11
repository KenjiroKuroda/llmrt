---
sidebar_position: 1
---

# LLM Canvas Engine - Quickstart Guide

Welcome to the LLM Canvas Engine (LLMRT)! This guide will get you up and running with your first game cartridge in minutes.

## What is LLMRT?

LLMRT is a tiny, dependency-free web runtime that executes JSON-based game cartridges. It's designed to be LLM-friendly, meaning AI models can reliably generate games without complex programming.

## Installation

### Option 1: CDN (Recommended for beginners)

```html
<!DOCTYPE html>
<html>
<head>
    <title>My LLMRT Game</title>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/llmrt@latest/dist/llmrt.min.js"></script>
    <script>
        // Your game code here
    </script>
</body>
</html>
```

### Option 2: NPM

```bash
npm install llmrt
```

```javascript
import { LLMRTEngine } from 'llmrt';
```

## Your First Game: Pong

Let's create a simple Pong game to understand the basics.

### Step 1: Create the HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
    <title>My First LLMRT Game</title>
    <style>
        body { margin: 0; padding: 20px; background: #000; }
        canvas { border: 1px solid #333; }
    </style>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/llmrt@latest/dist/llmrt.min.js"></script>
    <script>
        // Game code will go here
    </script>
</body>
</html>
```

### Step 2: Create Your Game Cartridge

```javascript
const pongCartridge = {
    "version": "1.0",
    "metadata": {
        "title": "Simple Pong",
        "author": "You",
        "description": "A basic Pong game"
    },
    "theme": {
        "colors": {
            "primary": "#ffffff",
            "secondary": "#cccccc",
            "background": "#000000",
            "text": "#ffffff",
            "accent": "#00ff00"
        },
        "font": {
            "family": "monospace",
            "sizes": {
                "small": 12,
                "medium": 16,
                "large": 24
            }
        },
        "spacing": {
            "small": 8,
            "medium": 16,
            "large": 32
        },
        "radii": {
            "small": 4,
            "medium": 8,
            "large": 16
        }
    },
    "scenes": [
        {
            "id": "game",
            "root": {
                "id": "root",
                "type": "Group",
                "transform": {
                    "position": [0, 0],
                    "scale": [1, 1],
                    "rotation": 0,
                    "skew": [0, 0],
                    "alpha": 1
                },
                "visible": true,
                "children": [
                    {
                        "id": "leftPaddle",
                        "type": "Sprite",
                        "transform": {
                            "position": [50, 300],
                            "scale": [1, 1],
                            "rotation": 0,
                            "skew": [0, 0],
                            "alpha": 1
                        },
                        "visible": true,
                        "sprite": "paddle",
                        "children": [],
                        "actions": [],
                        "triggers": [
                            {
                                "event": "on.key",
                                "key": "w",
                                "actions": [
                                    {
                                        "type": "tween",
                                        "target": "leftPaddle",
                                        "property": "position.y",
                                        "to": "position.y - 10",
                                        "duration": 0.1
                                    }
                                ]
                            },
                            {
                                "event": "on.key",
                                "key": "s",
                                "actions": [
                                    {
                                        "type": "tween",
                                        "target": "leftPaddle",
                                        "property": "position.y",
                                        "to": "position.y + 10",
                                        "duration": 0.1
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "id": "ball",
                        "type": "Sprite",
                        "transform": {
                            "position": [400, 300],
                            "scale": [1, 1],
                            "rotation": 0,
                            "skew": [0, 0],
                            "alpha": 1
                        },
                        "visible": true,
                        "sprite": "ball",
                        "children": [],
                        "actions": [],
                        "triggers": [
                            {
                                "event": "on.start",
                                "actions": [
                                    {
                                        "type": "setVar",
                                        "name": "ballVelX",
                                        "value": 5
                                    },
                                    {
                                        "type": "setVar",
                                        "name": "ballVelY",
                                        "value": 3
                                    }
                                ]
                            },
                            {
                                "event": "on.tick",
                                "actions": [
                                    {
                                        "type": "incVar",
                                        "name": "ballPosX",
                                        "value": "ballVelX"
                                    },
                                    {
                                        "type": "incVar",
                                        "name": "ballPosY",
                                        "value": "ballVelY"
                                    },
                                    {
                                        "type": "tween",
                                        "target": "ball",
                                        "property": "position",
                                        "to": ["ballPosX", "ballPosY"],
                                        "duration": 0.016
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "actions": [],
                "triggers": []
            }
        }
    ],
    "assets": {
        "sprites": [
            {
                "id": "paddle",
                "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAyCAYAAABevUU9AAAAFklEQVR42mNkYGBgZBhVOKpwVOGowlGFAA4AAP//2Q8AAAAASUVORK5CYII=",
                "width": 10,
                "height": 50
            },
            {
                "id": "ball",
                "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNkYGBgZBhVOKpwVOGowlGFAA4AAP//2Q8AAAAASUVORK5CYII=",
                "width": 10,
                "height": 10
            }
        ],
        "audio": [],
        "fonts": []
    },
    "variables": {
        "ballPosX": 400,
        "ballPosY": 300,
        "ballVelX": 5,
        "ballVelY": 3
    }
};
```

### Step 3: Initialize and Run the Engine

```javascript
async function startGame() {
    const canvas = document.getElementById('gameCanvas');
    const engine = new LLMRT.Engine(canvas);
    
    try {
        await engine.loadCartridge(pongCartridge);
        engine.start();
        console.log('Game started successfully!');
    } catch (error) {
        console.error('Failed to start game:', error);
    }
}

// Start the game when the page loads
window.addEventListener('load', startGame);
```

### Step 4: Test Your Game

Open your HTML file in a web browser. You should see a simple Pong game with:
- A left paddle controlled by W/S keys
- A ball that moves automatically
- Basic collision detection (if implemented in the engine)

## Next Steps

Now that you have a basic game running, you can:

1. **Add more features**: Check out the [Node Reference](node-reference.md) for all available node types
2. **Learn about actions**: See the [Actions/Triggers Reference](actions-triggers-reference.md) for game logic
3. **Customize the look**: Read the [Theming Guide](theming-guide.md) for visual customization
4. **Explore modules**: Try Mode-7, raycast, or isometric rendering for 3D effects
5. **Validate your cartridges**: Use the CLI validator to catch errors early

## Common Patterns

### Loading External Cartridges

```javascript
async function loadExternalCartridge() {
    const response = await fetch('my-game.lgf.json');
    const cartridge = await response.json();
    
    const engine = new LLMRT.Engine(canvas);
    await engine.loadCartridge(cartridge);
    engine.start();
}
```

### Handling User Input

```javascript
// In your cartridge's node triggers:
{
    "event": "on.key",
    "key": "space",
    "actions": [
        {
            "type": "playSfx",
            "id": "jump"
        }
    ]
}
```

### Creating Animations

```javascript
// Smooth movement with tweens:
{
    "type": "tween",
    "target": "player",
    "property": "position.x",
    "to": 500,
    "duration": 2.0,
    "easing": "ease-out"
}
```

## Troubleshooting

If your game isn't working:

1. **Check the browser console** for error messages
2. **Validate your cartridge** using the CLI validator
3. **Verify asset URLs** are accessible
4. **Check the [Troubleshooting Guide](troubleshooting.md)** for common issues

## What's Next?

- Explore the sample games in the `test-samples/` directory
- Try the interactive playground at `playground.html`
- Read the full documentation for advanced features
- Join the community for help and inspiration

Happy game making! 🎮