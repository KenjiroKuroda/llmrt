---
sidebar_position: 7
---

# Actions & Triggers Reference

The action and trigger system is the heart of LLMRT's game logic. Triggers define when things happen, and actions define what happens.

## Triggers

Triggers are events that can fire actions. They're attached to nodes and listen for specific events.

### Basic Trigger Structure

```json
{
  "event": "trigger_type",
  "actions": [
    // Actions to execute when triggered
  ]
}
```

### Core Trigger Types

#### on.start

Fires once when the node is first created or when the scene starts.

```json
{
  "event": "on.start",
  "actions": [
    {
      "type": "setVar",
      "name": "playerHealth",
      "value": 100
    }
  ]
}
```

**Use Cases:**
- Initialize variables
- Set up initial state
- Play intro animations
- Load resources

#### on.tick

Fires every game logic tick (60 times per second).

```json
{
  "event": "on.tick",
  "actions": [
    {
      "type": "incVar",
      "name": "gameTime",
      "value": 1
    }
  ]
}
```

**Use Cases:**
- Continuous movement
- Game timers
- Physics updates
- AI behavior

#### on.key

Fires when a specific key is pressed.

```json
{
  "event": "on.key",
  "key": "space",
  "state": "pressed",  // pressed, released, held (optional, default: pressed)
  "actions": [
    {
      "type": "playSfx",
      "id": "jump"
    }
  ]
}
```

**Properties:**
- `key`: Key name (space, enter, w, a, s, d, up, down, left, right, etc.)
- `state`: When to trigger (pressed, released, held)

**Use Cases:**
- Player controls
- Menu navigation
- Cheat codes
- Pause functionality

#### on.pointer

Fires when the mouse/touch pointer interacts with the node.

```json
{
  "event": "on.pointer",
  "button": 0,         // 0=left, 1=middle, 2=right
  "state": "pressed",  // pressed, released, moved (optional, default: pressed)
  "actions": [
    {
      "type": "gotoScene",
      "scene": "game"
    }
  ]
}
```

**Properties:**
- `button`: Mouse button (0=left, 1=middle, 2=right)
- `state`: Interaction type (pressed, released, moved)

**Use Cases:**
- Button clicks
- Drag and drop
- Touch controls
- Interactive objects

#### on.timer

Fires after a specified time delay.

```json
{
  "event": "on.timer",
  "delay": 3.0,        // Seconds
  "repeat": false,     // Whether to repeat (optional, default: false)
  "actions": [
    {
      "type": "spawn",
      "template": "enemy",
      "position": [100, 200]
    }
  ]
}
```

**Properties:**
- `delay`: Time in seconds before firing
- `repeat`: Whether to repeat the timer

**Use Cases:**
- Delayed events
- Spawning enemies
- Cutscene timing
- Power-up duration

### Module-Specific Triggers

#### on.raycastHit (Raycast Module)

Fires when a raycast collision is detected.

```json
{
  "event": "on.raycastHit",
  "target": "wall",    // What was hit
  "actions": [
    {
      "type": "playSfx",
      "id": "wallHit"
    }
  ]
}
```

## Actions

Actions define what happens when triggers fire. They can modify game state, control nodes, play audio, and more.

### Scene Management Actions

#### gotoScene

Changes to a different scene.

```json
{
  "type": "gotoScene",
  "scene": "gameOver",
  "transition": "fade"  // Optional transition effect
}
```

**Parameters:**
- `scene`: Target scene ID
- `transition`: Transition effect (fade, slide, none)

#### spawn

Creates a new node from a template.

```json
{
  "type": "spawn",
  "template": "enemy",
  "position": [200, 300],
  "parent": "gameWorld",  // Optional parent node
  "id": "enemy_01"        // Optional specific ID
}
```

**Parameters:**
- `template`: Template node to copy
- `position`: Spawn position [x, y]
- `parent`: Parent node ID (optional)
- `id`: Specific ID for the new node (optional)

#### despawn

Removes a node from the scene.

```json
{
  "type": "despawn",
  "target": "enemy_01"
}
```

**Parameters:**
- `target`: Node ID to remove

### Variable Actions

#### setVar

Sets a variable to a specific value.

```json
{
  "type": "setVar",
  "name": "score",
  "value": 1000
}
```

**Parameters:**
- `name`: Variable name
- `value`: New value (number, string, or boolean)

#### incVar

Increments a variable by a value.

```json
{
  "type": "incVar",
  "name": "score",
  "value": 10
}
```

**Parameters:**
- `name`: Variable name
- `value`: Amount to add (can be negative)

#### randomInt

Sets a variable to a random integer.

```json
{
  "type": "randomInt",
  "name": "enemyType",
  "min": 1,
  "max": 3
}
```

**Parameters:**
- `name`: Variable name to set
- `min`: Minimum value (inclusive)
- `max`: Maximum value (inclusive)

### Control Flow Actions

#### if

Conditionally executes actions based on a condition.

```json
{
  "type": "if",
  "condition": {
    "variable": "playerHealth",
    "operator": "<=",
    "value": 0
  },
  "then": [
    {
      "type": "gotoScene",
      "scene": "gameOver"
    }
  ],
  "else": [
    {
      "type": "playSfx",
      "id": "hurt"
    }
  ]
}
```

**Parameters:**
- `condition`: Condition to evaluate
- `then`: Actions to execute if true
- `else`: Actions to execute if false (optional)

**Condition Operators:**
- `==`, `!=`: Equality
- `<`, `<=`, `>`, `>=`: Comparison
- `&&`, `||`: Logical AND/OR

### Animation Actions

#### tween

Smoothly animates a node property over time.

```json
{
  "type": "tween",
  "target": "player",
  "property": "position.x",
  "to": 500,
  "duration": 2.0,
  "easing": "ease-out",    // Optional easing function
  "onComplete": [          // Optional actions when done
    {
      "type": "playSfx",
      "id": "arrive"
    }
  ]
}
```

**Parameters:**
- `target`: Node ID to animate
- `property`: Property path (position.x, scale.y, alpha, etc.)
- `to`: Target value
- `duration`: Animation time in seconds
- `easing`: Easing function (linear, ease-in, ease-out, ease-in-out)
- `onComplete`: Actions to execute when animation finishes

**Animatable Properties:**
- `position.x`, `position.y`
- `scale.x`, `scale.y`
- `rotation`
- `skew.x`, `skew.y`
- `alpha`
- Camera properties (zoom, position)
- Module-specific properties

#### playSprite

Plays a sprite animation.

```json
{
  "type": "playSprite",
  "target": "player",
  "animation": "walk",
  "loop": true,
  "speed": 1.0
}
```

**Parameters:**
- `target`: Sprite node ID
- `animation`: Animation name
- `loop`: Whether to loop the animation
- `speed`: Playback speed multiplier

### Camera Actions

#### setCamera

Instantly sets camera properties.

```json
{
  "type": "setCamera",
  "target": "mainCamera",
  "zoom": 2.0,
  "position": [400, 300]
}
```

**Parameters:**
- `target`: Camera node ID
- `zoom`: Zoom level
- `position`: Camera position [x, y]

#### moveCamera

Smoothly moves the camera.

```json
{
  "type": "moveCamera",
  "target": "mainCamera",
  "position": [800, 600],
  "duration": 3.0
}
```

**Parameters:**
- `target`: Camera node ID
- `position`: Target position [x, y]
- `duration`: Movement time in seconds

#### shake

Applies screen shake effect.

```json
{
  "type": "shake",
  "target": "mainCamera",
  "intensity": 10,
  "duration": 0.5
}
```

**Parameters:**
- `target`: Camera node ID
- `intensity`: Shake strength
- `duration`: Shake time in seconds

### Audio Actions

#### playSfx

Plays a sound effect.

```json
{
  "type": "playSfx",
  "id": "explosion",
  "volume": 0.8,
  "pitch": 1.0
}
```

**Parameters:**
- `id`: Audio asset ID
- `volume`: Volume level (0.0 to 1.0)
- `pitch`: Pitch multiplier (optional)

#### playMusic

Plays background music.

```json
{
  "type": "playMusic",
  "id": "bgm_level1",
  "loop": true,
  "volume": 0.6,
  "fadeIn": 2.0
}
```

**Parameters:**
- `id`: Audio asset ID
- `loop`: Whether to loop the music
- `volume`: Volume level (0.0 to 1.0)
- `fadeIn`: Fade-in time in seconds (optional)

#### stopMusic

Stops the currently playing music.

```json
{
  "type": "stopMusic",
  "fadeOut": 1.0
}
```

**Parameters:**
- `fadeOut`: Fade-out time in seconds (optional)

### Timer Actions

#### startTimer

Starts a named timer.

```json
{
  "type": "startTimer",
  "name": "powerUpTimer",
  "duration": 10.0
}
```

**Parameters:**
- `name`: Timer name
- `duration`: Timer duration in seconds

#### stopTimer

Stops a named timer.

```json
{
  "type": "stopTimer",
  "name": "powerUpTimer"
}
```

**Parameters:**
- `name`: Timer name to stop

### Particle Actions

#### emit

Starts particle emission.

```json
{
  "type": "emit",
  "target": "explosion",
  "count": 50,
  "duration": 2.0
}
```

**Parameters:**
- `target`: Particles2D node ID
- `count`: Number of particles to emit
- `duration`: Emission duration in seconds

## Common Patterns

### Player Movement

```json
{
  "triggers": [
    {
      "event": "on.key",
      "key": "w",
      "state": "held",
      "actions": [
        {
          "type": "tween",
          "target": "player",
          "property": "position.y",
          "to": "position.y - 5",
          "duration": 0.016
        }
      ]
    }
  ]
}
```

### Health System

```json
{
  "triggers": [
    {
      "event": "on.start",
      "actions": [
        {
          "type": "setVar",
          "name": "playerHealth",
          "value": 100
        }
      ]
    },
    {
      "event": "on.pointer",
      "actions": [
        {
          "type": "incVar",
          "name": "playerHealth",
          "value": -10
        },
        {
          "type": "if",
          "condition": {
            "variable": "playerHealth",
            "operator": "<=",
            "value": 0
          },
          "then": [
            {
              "type": "gotoScene",
              "scene": "gameOver"
            }
          ]
        }
      ]
    }
  ]
}
```

### Enemy Spawner

```json
{
  "triggers": [
    {
      "event": "on.timer",
      "delay": 2.0,
      "repeat": true,
      "actions": [
        {
          "type": "randomInt",
          "name": "spawnX",
          "min": 50,
          "max": 750
        },
        {
          "type": "spawn",
          "template": "enemy",
          "position": ["spawnX", 0]
        }
      ]
    }
  ]
}
```

### Collectible Item

```json
{
  "triggers": [
    {
      "event": "on.pointer",
      "actions": [
        {
          "type": "incVar",
          "name": "score",
          "value": 100
        },
        {
          "type": "playSfx",
          "id": "collect"
        },
        {
          "type": "emit",
          "target": "collectEffect",
          "count": 20,
          "duration": 0.5
        },
        {
          "type": "despawn",
          "target": "self"
        }
      ]
    }
  ]
}
```

### Menu System

```json
{
  "triggers": [
    {
      "event": "on.key",
      "key": "escape",
      "actions": [
        {
          "type": "if",
          "condition": {
            "variable": "gameState",
            "operator": "==",
            "value": "playing"
          },
          "then": [
            {
              "type": "setVar",
              "name": "gameState",
              "value": "paused"
            },
            {
              "type": "gotoScene",
              "scene": "pauseMenu"
            }
          ],
          "else": [
            {
              "type": "setVar",
              "name": "gameState",
              "value": "playing"
            },
            {
              "type": "gotoScene",
              "scene": "game"
            }
          ]
        }
      ]
    }
  ]
}
```

### Animated UI

```json
{
  "triggers": [
    {
      "event": "on.start",
      "actions": [
        {
          "type": "tween",
          "target": "titleText",
          "property": "alpha",
          "to": 1,
          "duration": 1.0,
          "easing": "ease-out"
        },
        {
          "type": "tween",
          "target": "titleText",
          "property": "scale.x",
          "to": 1.2,
          "duration": 2.0,
          "easing": "ease-in-out"
        }
      ]
    }
  ]
}
```

## Best Practices

### Performance
- Use `on.tick` sparingly - it fires 60 times per second
- Prefer timers over tick-based counters when possible
- Group related actions together
- Use conditions to avoid unnecessary actions

### Organization
- Keep trigger logic simple and focused
- Use descriptive variable names
- Comment complex action sequences
- Group related triggers on the same node

### Debugging
- Use console actions for debugging (if available)
- Test conditions with simple actions first
- Break complex sequences into smaller parts
- Use the playground for rapid iteration

The action and trigger system provides all the game logic you need without writing code. By combining these building blocks, you can create complex, interactive games entirely through JSON configuration.