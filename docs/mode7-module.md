---
sidebar_position: 4
---

# Mode-7 Rendering Module

The Mode-7 rendering module provides fake-3D plane rendering capabilities for the LLM Canvas Engine, enabling retro-style racing game effects and pseudo-3D ground planes.

## Overview

Mode-7 is a graphics technique that creates the illusion of 3D by applying perspective transformation to a 2D texture. This module implements the mathematical transformations needed to render a textured ground plane with proper perspective, horizon line, and camera controls.

## Features

- **Perspective Transformation**: Accurate Mode-7 math for screen-to-world and world-to-screen coordinate conversion
- **Texture Mapping**: Support for repeating textures with scaling and offset controls
- **Camera System**: Full 6DOF camera with position, rotation, height, pitch, and FOV
- **Horizon Control**: Adjustable horizon line position for different viewing angles
- **Performance Optimized**: Scanline-based rendering for efficient pixel-perfect output
- **Module Integration**: Seamless integration with the core renderer and action system

## Node Type: Mode7Plane

### Properties

```typescript
interface Mode7PlaneNode extends Node {
  type: 'Mode7Plane';
  texture: string;           // Texture asset ID
  horizon: number;           // Horizon position (0-1, where 0.5 is center)
  scale: number;             // Texture scale factor
  offset: Vector2;           // Texture offset for scrolling
  textureWidth?: number;     // Texture width in pixels (default: 256)
  textureHeight?: number;    // Texture height in pixels (default: 256)
}
```

### Example Usage

```json
{
  "id": "ground-plane",
  "type": "Mode7Plane",
  "transform": {
    "position": { "x": 0, "y": 0 },
    "scale": { "x": 1, "y": 1 },
    "rotation": 0,
    "skew": { "x": 0, "y": 0 },
    "alpha": 1
  },
  "visible": true,
  "texture": "road-texture",
  "horizon": 0.4,
  "scale": 2.0,
  "offset": { "x": 0, "y": 0 },
  "textureWidth": 256,
  "textureHeight": 256
}
```

## Camera System

The Mode-7 camera provides full control over the viewing perspective:

```typescript
interface Mode7Camera {
  position: Vector2;    // World position (x, y)
  rotation: number;     // Camera rotation in radians
  height: number;       // Camera height above ground plane
  pitch: number;        // Camera pitch angle in radians
  fov: number;          // Field of view in radians
}
```

### Default Camera Settings

- **Position**: `{ x: 0, y: 0 }`
- **Rotation**: `0` (facing forward)
- **Height**: `100` units above ground
- **Pitch**: `π/6` (30 degrees downward)
- **FOV**: `π/3` (60 degrees)

## Actions

The Mode-7 module provides two custom actions for camera control:

### setMode7Camera

Sets the Mode-7 camera parameters directly.

```json
{
  "type": "setMode7Camera",
  "params": {
    "position": { "x": 100, "y": 200 },
    "rotation": 0.785,
    "height": 150,
    "pitch": 0.524,
    "fov": 1.047
  }
}
```

### moveMode7Camera

Moves the Mode-7 camera by relative amounts.

```json
{
  "type": "moveMode7Camera",
  "params": {
    "deltaPosition": { "x": 10, "y": 5 },
    "deltaRotation": 0.1,
    "deltaHeight": 20
  }
}
```

## Mathematical Foundation

### Screen to World Transformation

The Mode-7 transformation converts screen coordinates to world coordinates using perspective projection:

1. **Normalize screen coordinates** to [-1, 1] range
2. **Calculate distance** from camera based on Y position and camera height
3. **Apply perspective projection** using camera pitch angle
4. **Rotate and translate** by camera position and rotation

### World to Screen Transformation

The inverse transformation projects world coordinates to screen space:

1. **Translate** world coordinates relative to camera position
2. **Rotate** by inverse camera rotation
3. **Apply perspective projection** based on distance from camera
4. **Convert** to screen coordinates with horizon line offset

### Texture Coordinate Mapping

Texture coordinates are calculated using:

```
u = (worldX * scale + offsetX) % textureWidth
v = (worldY * scale + offsetY) % textureHeight
```

With proper handling for negative coordinates and texture wrapping.

## Performance Considerations

- **Scanline Rendering**: The module renders line-by-line for optimal performance
- **Texture Caching**: Textures are cached to avoid repeated loading
- **Pixel-Perfect**: Uses ImageData for direct pixel manipulation
- **Viewport Culling**: Only renders visible portions of the plane

## Integration Example

```typescript
import { registerMode7Module } from './modules/mode7.js';
import { Renderer } from './core/renderer.js';

// Register the Mode-7 module
registerMode7Module();

// Create scene with Mode-7 plane
const scene = {
  id: 'racing-game',
  root: {
    id: 'root',
    type: 'Group',
    children: [
      {
        id: 'ground',
        type: 'Mode7Plane',
        texture: 'road-texture',
        horizon: 0.4,
        scale: 1.5,
        offset: { x: 0, y: 0 }
      }
    ]
  }
};

// Render with Mode-7 camera
const renderer = new Renderer(canvas, theme);
renderer.render([scene.root], interpolation);
```

## Common Use Cases

### Racing Games
- Ground plane with road texture
- Moving texture offset for speed effect
- Camera following player vehicle

### Flight Simulators
- Terrain rendering with elevation mapping
- Cloud layer effects
- Runway and airport textures

### Retro Platformers
- Background parallax layers
- Pseudo-3D environments
- Classic arcade aesthetics

## Troubleshooting

### Common Issues

1. **Texture Not Displaying**: Ensure texture asset is loaded and ID matches
2. **Incorrect Perspective**: Check camera height and pitch values
3. **Performance Issues**: Reduce viewport size or texture resolution
4. **Math Errors**: Verify horizon value is between 0 and 1

### Debug Tips

- Use placeholder rendering to verify node setup
- Check console for texture loading errors
- Test with simple solid color textures first
- Verify camera parameters are reasonable

## Module Size

The Mode-7 module adds approximately **8 KB** to the bundle size when included, making it suitable for size-conscious applications while providing powerful pseudo-3D capabilities.

## Browser Compatibility

The Mode-7 module works in all modern browsers that support:
- Canvas 2D rendering context
- ImageData manipulation
- Typed arrays (Uint8ClampedArray)

## See Also

- [API Documentation](./api-documentation.md)
- [Node Reference](./node-reference.md)
- [Action Triggers Reference](./actions-triggers-reference.md)
- [Sample Games](../examples/)