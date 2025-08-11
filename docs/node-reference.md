---
sidebar_position: 3
---

# Node Reference

Nodes are the building blocks of your LLMRT game. They form a hierarchical tree structure that defines your game's visual and interactive elements.

## Base Node Properties

All nodes share these common properties:

```typescript
interface Node {
  id: string              // Unique identifier for the node
  type: NodeType          // The type of node (see types below)
  transform: Transform2D  // Position, scale, rotation, etc.
  visible: boolean        // Whether the node is rendered
  children: Node[]        // Child nodes
  actions: Action[]       // Actions to execute
  triggers: Trigger[]     // Event triggers
}

interface Transform2D {
  position: [number, number]  // [x, y] coordinates
  scale: [number, number]     // [scaleX, scaleY] multipliers
  rotation: number            // Rotation in degrees
  skew: [number, number]      // [skewX, skewY] in degrees
  alpha: number               // Opacity (0.0 to 1.0)
}
```

## Core Node Types

### Group

A container node that groups other nodes together. Useful for organizing and transforming multiple nodes as a unit.

```json
{
  "id": "playerGroup",
  "type": "Group",
  "transform": {
    "position": [100, 200],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [
    // Child nodes here
  ],
  "actions": [],
  "triggers": []
}
```

**Use Cases:**
- Grouping related sprites (player + weapon)
- Creating composite objects
- Applying transforms to multiple nodes
- Organizing UI elements

### Sprite

Displays a 2D image or texture.

```json
{
  "id": "player",
  "type": "Sprite",
  "sprite": "player_idle",  // Asset ID
  "frame": 0,               // Animation frame (optional)
  "flipX": false,           // Horizontal flip (optional)
  "flipY": false,           // Vertical flip (optional)
  "tint": "#ffffff",        // Color tint (optional)
  "transform": {
    "position": [400, 300],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Properties:**
- `sprite`: Asset ID of the image to display
- `frame`: Current animation frame (for sprite sheets)
- `flipX/flipY`: Mirror the sprite horizontally/vertically
- `tint`: Color overlay (hex color)

**Use Cases:**
- Player characters
- Enemies and NPCs
- Background elements
- UI icons

### Text

Renders text using the theme's font settings.

```json
{
  "id": "scoreText",
  "type": "Text",
  "text": "Score: 0",
  "fontSize": "medium",     // Theme font size key
  "color": "text",          // Theme color key
  "align": "center",        // left, center, right
  "baseline": "middle",     // top, middle, bottom
  "maxWidth": 200,          // Text wrapping width (optional)
  "transform": {
    "position": [400, 50],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Properties:**
- `text`: The text content to display
- `fontSize`: Theme font size key or pixel value
- `color`: Theme color key or hex color
- `align`: Horizontal alignment
- `baseline`: Vertical alignment
- `maxWidth`: Maximum width before wrapping

**Use Cases:**
- Score displays
- Menu text
- Dialog boxes
- Instructions

### Button

An interactive text or sprite element that responds to clicks/taps.

```json
{
  "id": "startButton",
  "type": "Button",
  "text": "Start Game",      // Text content (if text button)
  "sprite": "button_bg",  // Background sprite (optional)
  "fontSize": "large",
  "color": "text",
  "hoverColor": "accent", // Color when hovered
  "pressedColor": "secondary", // Color when pressed
  "padding": [16, 8],     // [horizontal, vertical] padding
  "transform": {
    "position": [400, 300],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": [
    {
      "event": "on.pointer",
      "button": 0,
      "actions": [
        {
          "type": "gotoScene",
          "scene": "game"
        }
      ]
    }
  ]
}
```

**Properties:**
- `text`: Button text (for text buttons)
- `sprite`: Background sprite asset ID
- `fontSize`, `color`: Text styling
- `hoverColor`, `pressedColor`: Interactive state colors
- `padding`: Internal spacing

**Use Cases:**
- Menu buttons
- UI controls
- Interactive elements

### Camera2D

Defines the viewport and camera controls for 2D scenes.

```json
{
  "id": "mainCamera",
  "type": "Camera2D",
  "zoom": 1.0,              // Zoom level
  "bounds": {               // Camera movement bounds (optional)
    "left": -1000,
    "right": 1000,
    "top": -1000,
    "bottom": 1000
  },
  "follow": "player",       // Node ID to follow (optional)
  "followSpeed": 0.1,       // Follow interpolation speed
  "shake": {                // Screen shake parameters
    "intensity": 0,
    "duration": 0
  },
  "transform": {
    "position": [0, 0],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Properties:**
- `zoom`: Camera zoom level (1.0 = normal)
- `bounds`: Movement constraints
- `follow`: Node ID to automatically follow
- `followSpeed`: How quickly to follow (0-1)
- `shake`: Screen shake effect parameters

**Use Cases:**
- Following the player
- Cinematic camera movements
- Screen shake effects
- Zoom effects

### Particles2D

A particle system for visual effects.

```json
{
  "id": "explosion",
  "type": "Particles2D",
  "maxParticles": 100,
  "emissionRate": 50,       // Particles per second
  "lifetime": 2.0,          // Particle lifetime in seconds
  "sprite": "particle",     // Particle sprite asset
  "startColor": "#ff0000",
  "endColor": "#ffff00",
  "startSize": 1.0,
  "endSize": 0.0,
  "velocity": {
    "min": [-50, -100],
    "max": [50, -50]
  },
  "acceleration": [0, 98],  // Gravity
  "emitting": false,        // Start emitting immediately
  "transform": {
    "position": [400, 300],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Properties:**
- `maxParticles`: Maximum number of active particles
- `emissionRate`: Particles spawned per second
- `lifetime`: How long each particle lives
- `sprite`: Particle texture asset ID
- `startColor/endColor`: Color animation
- `startSize/endSize`: Size animation
- `velocity`: Initial velocity range
- `acceleration`: Constant acceleration (gravity)
- `emitting`: Whether actively spawning particles

**Use Cases:**
- Explosions
- Fire effects
- Magic spells
- Environmental effects

## Module Node Types

These nodes are available when their respective modules are included:

### Mode7Plane (Mode-7 Module)

Creates a fake-3D ground plane using Mode-7 perspective transformation.

```json
{
  "id": "ground",
  "type": "Mode7Plane",
  "texture": "ground_texture",
  "horizon": 0.5,           // Horizon line position (0-1)
  "scale": 1.0,             // Texture scale
  "offset": [0, 0],         // Texture offset
  "transform": {
    "position": [0, 0],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Use Cases:**
- Racing game tracks
- Flying over terrain
- Retro 3D effects

### RaycastMap (Raycast Module)

Creates a fake-3D environment using raycasting (like Wolfenstein 3D).

```json
{
  "id": "level",
  "type": "RaycastMap",
  "map": [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1]
  ],
  "textures": ["wall1", "wall2"],
  "billboards": [
    {
      "position": [1.5, 1.5],
      "sprite": "enemy",
      "scale": 1.0
    }
  ],
  "fov": 60,                // Field of view in degrees
  "renderDistance": 10,     // Maximum render distance
  "transform": {
    "position": [0, 0],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Use Cases:**
- First-person shooters
- Dungeon crawlers
- Maze games

### TilemapIso (Isometric Module)

Renders an isometric tilemap for fake-3D environments.

```json
{
  "id": "isoMap",
  "type": "TilemapIso",
  "tileset": "iso_tiles",
  "map": [
    [1, 2, 1],
    [2, 3, 2],
    [1, 2, 1]
  ],
  "tileSize": [64, 32],     // Tile dimensions
  "elevation": [
    [0, 1, 0],
    [1, 2, 1],
    [0, 1, 0]
  ],
  "transform": {
    "position": [400, 200],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Use Cases:**
- Strategy games
- RPG environments
- City builders

### PostChain (Post-FX Module)

Applies post-processing effects to the rendered scene.

```json
{
  "id": "effects",
  "type": "PostChain",
  "effects": [
    {
      "type": "vignette",
      "intensity": 0.5,
      "color": "#000000"
    },
    {
      "type": "bloom",
      "threshold": 0.8,
      "intensity": 0.3
    },
    {
      "type": "colorGrade",
      "brightness": 1.1,
      "contrast": 1.2,
      "saturation": 0.9
    }
  ],
  "transform": {
    "position": [0, 0],
    "scale": [1, 1],
    "rotation": 0,
    "skew": [0, 0],
    "alpha": 1
  },
  "visible": true,
  "children": [],
  "actions": [],
  "triggers": []
}
```

**Use Cases:**
- Atmospheric effects
- Visual polish
- Retro CRT simulation

## Node Hierarchy Best Practices

### Organization
```json
{
  "id": "root",
  "type": "Group",
  "children": [
    {
      "id": "background",
      "type": "Group",
      "children": [/* background elements */]
    },
    {
      "id": "gameplay",
      "type": "Group",
      "children": [/* game objects */]
    },
    {
      "id": "ui",
      "type": "Group",
      "children": [/* UI elements */]
    },
    {
      "id": "effects",
      "type": "Group",
      "children": [/* particles, post-fx */]
    }
  ]
}
```

### Transform Inheritance
- Child nodes inherit their parent's transform
- Use groups to apply transforms to multiple objects
- Position children relative to their parent

### Performance Tips
- Keep the node tree shallow when possible
- Use `visible: false` to hide nodes instead of removing them
- Group static elements together
- Limit the number of active particles

## Common Patterns

### Animated Sprites
```json
{
  "id": "player",
  "type": "Sprite",
  "sprite": "player_walk",
  "triggers": [
    {
      "event": "on.tick",
      "actions": [
        {
          "type": "playSprite",
          "target": "player",
          "animation": "walk",
          "loop": true
        }
      ]
    }
  ]
}
```

### Interactive UI
```json
{
  "id": "menu",
  "type": "Group",
  "children": [
    {
      "id": "title",
      "type": "Text",
      "text": "Game Menu",
      "fontSize": "large"
    },
    {
      "id": "playButton",
      "type": "Button",
      "text": "Play",
      "triggers": [
        {
          "event": "on.pointer",
          "actions": [{"type": "gotoScene", "scene": "game"}]
        }
      ]
    }
  ]
}
```

### Following Camera
```json
{
  "id": "camera",
  "type": "Camera2D",
  "follow": "player",
  "followSpeed": 0.1,
  "bounds": {
    "left": -500,
    "right": 500,
    "top": -300,
    "bottom": 300
  }
}
```

This reference covers all the node types available in LLMRT. Each node type is designed to be simple yet powerful, allowing you to create complex games through composition and the action/trigger system.