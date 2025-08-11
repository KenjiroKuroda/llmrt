# LLM Canvas Engine Sample Cartridges

This directory contains sample cartridges that demonstrate the capabilities of the LLM Canvas Engine (LLMRT). Each sample showcases different aspects of the engine and serves as both a reference implementation and a testing resource.

## Sample Overview

### 1. Pong Game (`pong.lgf.json`)

**Demonstrates:** Basic 2D gameplay mechanics

A classic Pong implementation featuring:
- **Two-player paddle controls** (WASD for Player 1, Arrow Keys for Player 2)
- **Ball physics simulation** with velocity-based movement and collision detection
- **Score tracking** with real-time display updates
- **Audio feedback** for ball bounces and scoring events
- **Collision detection** with screen boundaries and paddles
- **Game state management** with automatic ball reset after scoring

**Key Features:**
- Sprite-based rendering for paddles, ball, and center line
- Text rendering for score display
- Input handling with key mapping
- Variable management for game state
- Tween animations for smooth paddle movement
- Audio asset integration

**Performance Characteristics:**
- 4 active sprites (2 paddles, 1 ball, 1 center line)
- 2 text elements for scoring
- Minimal memory footprint
- 60 FPS target performance

### 2. Raycast Corridor (`corridor.lgf.json`)

**Demonstrates:** Raycast module features for fake-3D rendering

A first-person corridor exploration game featuring:
- **Raycast rendering** with textured walls and perspective projection
- **First-person movement** with WASD/Arrow key controls
- **Collision detection** preventing movement through walls
- **Billboard sprites** for interactive torch elements
- **Real-time position tracking** with on-screen display
- **Atmospheric audio** with spatial sound effects

**Key Features:**
- RaycastMap node with 10x10 grid-based level design
- Texture mapping for wall surfaces
- Billboard rendering for 3D sprite effects
- Player position and angle tracking
- Collision detection with map boundaries
- Interactive elements with raycast hit detection
- UI overlay with instructions and position display

**Performance Characteristics:**
- 1 fake-3D surface (RaycastMap)
- 4 billboard sprites (torches)
- Field of view: 60 degrees
- Render distance: 10 units
- Optimized raycasting algorithm

### 3. Mode-7 Racer (`racer.lgf.json`)

**Demonstrates:** Mode-7 perspective rendering capabilities

A retro-style racing game featuring:
- **Mode-7 ground plane rendering** with textured road surface
- **Racing car physics** with acceleration, deceleration, and turning
- **Smooth camera movement** following the car's position
- **Post-processing effects** including vignette and color grading
- **Dynamic UI elements** showing speed and position
- **Visual feedback** with screen shake at high speeds

**Key Features:**
- Mode7Plane node with perspective texture mapping
- Car physics simulation with realistic acceleration curves
- Camera tracking with smooth interpolation
- Post-processing chain with multiple effects
- Speed-based visual effects (vignette intensity, screen shake)
- Comprehensive UI with speedometer and position display
- Theme-based color scheme with retro aesthetics

**Performance Characteristics:**
- 1 fake-3D surface (Mode7Plane)
- 1 car sprite with dynamic rotation
- 2 post-processing effects
- Real-time camera movement
- 60 FPS target with smooth interpolation

## Technical Implementation

### Schema Compliance

All samples are fully compliant with the LGF (LLM Game Format) schema version 1.0:
- ✅ Valid JSON structure with required fields
- ✅ Proper node hierarchy and transform definitions
- ✅ Correct action and trigger implementations
- ✅ Asset manifest with proper resource references
- ✅ Theme token consistency across samples

### Performance Requirements

Each sample meets the engine's performance criteria:
- **Bundle Size:** Core engine ≤ 15 KB gzipped, with modules ≤ 20 KB
- **Frame Rate:** 60 FPS on mobile, 120+ FPS on desktop
- **Memory Usage:** ≤ 64 MB total memory consumption
- **Sprite Limits:** ≤ 200 active sprites per sample
- **3D Surfaces:** ≤ 1 fake-3D surface per sample
- **Billboards:** ≤ 200 billboard sprites per sample

### Asset Organization

All samples use consistent asset organization:
- **Sprites:** Base64-encoded placeholder images for portability
- **Audio:** Referenced external audio files with proper type classification
- **Fonts:** System font fallbacks for maximum compatibility
- **Textures:** Optimized dimensions for performance

### Theme Consistency

Each sample implements the unified theming system:
- **Color Tokens:** Primary, secondary, background, text, and accent colors
- **Typography:** Consistent font sizing with accessibility considerations
- **Spacing:** Standardized spacing tokens for layout consistency
- **Accessibility:** High contrast ratios and keyboard navigation support

## Usage Instructions

### Running the Samples

1. **Load a cartridge** into the LLMRT engine:
   ```javascript
   const engine = new LLMRTEngine();
   await engine.loadCartridge(pongCartridge);
   engine.start();
   ```

2. **Validate samples** using the CLI tool:
   ```bash
   node dist/cli/validator.js test-samples/pong.lgf.json
   ```

3. **Test functionality** using the automated test suite:
   ```bash
   npm test src/core/sample-cartridges.test.ts
   ```

### Controls

- **Pong:** WASD (Player 1), Arrow Keys (Player 2)
- **Corridor:** WASD or Arrow Keys for movement
- **Racer:** WASD or Arrow Keys for driving

### Customization

Each sample can be customized by modifying:
- **Theme tokens** for visual appearance
- **Game variables** for gameplay parameters
- **Asset references** for custom graphics and audio
- **Action parameters** for behavior tweaking

## Development Notes

### LLM Generation Compatibility

These samples are specifically designed to be LLM-friendly:
- **Clear structure** with consistent patterns
- **Comprehensive comments** in metadata descriptions
- **Modular design** allowing easy modification
- **Error-resistant** with graceful fallbacks
- **Schema-compliant** for reliable validation

### Testing Coverage

Each sample includes comprehensive test coverage:
- **Schema validation** against LGF specification
- **Functionality testing** for core game mechanics
- **Performance validation** against engine requirements
- **Cross-sample consistency** checks
- **Asset integrity** verification

### Future Extensions

These samples serve as a foundation for:
- **Educational tutorials** demonstrating engine features
- **LLM training data** for game generation
- **Performance benchmarking** for optimization
- **Feature testing** for new engine capabilities
- **Community examples** for developer reference

## Requirements Mapping

These samples fulfill the following specification requirements:

- **Requirement 9.1:** ✅ pong.lgf.json demonstrates basic 2D gameplay
- **Requirement 9.2:** ✅ corridor.lgf.json demonstrates raycast rendering
- **Requirement 9.3:** ✅ racer.lgf.json demonstrates Mode-7 rendering
- **Requirement 9.4:** ✅ All samples demonstrate engine capabilities with comprehensive documentation

The samples collectively showcase the full range of LLMRT engine capabilities while maintaining optimal performance and LLM generation compatibility.