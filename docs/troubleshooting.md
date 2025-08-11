---
sidebar_position: 9
---

# Troubleshooting Guide

This guide helps you diagnose and fix common issues when developing with the LLM Canvas Engine (LLMRT).

## Common Issues

### Cartridge Loading Problems

#### "Invalid cartridge format" Error

**Symptoms:**
- Error message: "Invalid cartridge format" or "Schema validation failed"
- Game fails to load
- Console shows validation errors

**Causes & Solutions:**

1. **JSON Syntax Errors**
   ```bash
   # Use the CLI validator to check syntax
   npx llmrt-validator my-game.lgf.json
   ```
   
   Common JSON issues:
   - Missing commas between properties
   - Trailing commas (not allowed in JSON)
   - Unquoted property names
   - Single quotes instead of double quotes

2. **Missing Required Fields**
   ```json
   // ❌ Missing required fields
   {
     "version": "1.0"
     // Missing metadata, theme, scenes, assets
   }
   
   // ✅ Correct structure
   {
     "version": "1.0",
     "metadata": { "title": "Game", "author": "You", "description": "..." },
     "theme": { /* theme tokens */ },
     "scenes": [ /* scenes */ ],
     "assets": { "sprites": [], "audio": [], "fonts": [] }
   }
   ```

3. **Invalid Node Structure**
   ```json
   // ❌ Missing required node properties
   {
     "id": "player",
     "type": "Sprite"
     // Missing transform, visible, children, actions, triggers
   }
   
   // ✅ Complete node structure
   {
     "id": "player",
     "type": "Sprite",
     "sprite": "player_idle",
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

#### "Asset not found" Error

**Symptoms:**
- Missing sprites or broken images
- Silent audio failures
- Console errors about failed asset loads

**Solutions:**

1. **Check Asset URLs**
   ```json
   // ❌ Incorrect relative path
   {
     "id": "player",
     "url": "assets/player.png"  // File doesn't exist
   }
   
   // ✅ Correct path or data URL
   {
     "id": "player",
     "url": "./sprites/player.png"  // Relative to HTML file
   }
   ```

2. **Use Data URLs for Small Assets**
   ```json
   {
     "id": "pixel",
     "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA4nEKtAAAAABJRU5ErkJggg==",
     "width": 1,
     "height": 1
   }
   ```

3. **Check CORS for External Assets**
   ```javascript
   // If loading from different domain, ensure CORS headers are set
   // Or use a local proxy/CDN
   ```

### Performance Issues

#### Low Frame Rate

**Symptoms:**
- Game runs slower than 60 FPS
- Stuttering or jerky movement
- Performance stats show high frame times

**Diagnosis:**
```javascript
// Enable performance monitoring
const engine = new LLMRT.Engine(canvas, { 
  debug: true, 
  showFPS: true, 
  showStats: true 
});

// Check performance stats
const stats = engine.getPerformanceStats();
console.log('FPS:', stats.fps);
console.log('Frame time:', stats.frameTime);
console.log('Node count:', stats.nodeCount);
```

**Solutions:**

1. **Reduce Node Count**
   ```json
   // ❌ Too many individual nodes
   {
     "children": [
       {"id": "star1", "type": "Sprite"},
       {"id": "star2", "type": "Sprite"},
       // ... 100 more stars
     ]
   }
   
   // ✅ Use particle system instead
   {
     "id": "stars",
     "type": "Particles2D",
     "maxParticles": 100,
     "sprite": "star"
   }
   ```

2. **Optimize Particle Systems**
   ```json
   // ❌ Too many particles
   {
     "maxParticles": 10000,  // Way too many
     "emissionRate": 1000
   }
   
   // ✅ Reasonable particle count
   {
     "maxParticles": 200,
     "emissionRate": 50
   }
   ```

3. **Use Visibility Culling**
   ```json
   // Hide off-screen objects
   {
     "triggers": [
       {
         "event": "on.tick",
         "actions": [
           {
             "type": "if",
             "condition": {
               "variable": "player.position.x",
               "operator": ">",
               "value": 1000
             },
             "then": [
               {
                 "type": "setProperty",
                 "target": "distantObject",
                 "property": "visible",
                 "value": false
               }
             ]
           }
         ]
       }
     ]
   }
   ```

#### Memory Issues

**Symptoms:**
- Browser tab crashes
- "Out of memory" errors
- Gradually increasing memory usage

**Solutions:**

1. **Limit Asset Sizes**
   ```json
   // ❌ Huge texture
   {
     "id": "background",
     "url": "huge-4k-image.png"  // 4096x4096 texture
   }
   
   // ✅ Reasonable size
   {
     "id": "background",
     "url": "background-1024.png"  // 1024x1024 or smaller
   }
   ```

2. **Clean Up Spawned Objects**
   ```json
   {
     "triggers": [
       {
         "event": "on.tick",
         "actions": [
           {
             "type": "if",
             "condition": {
               "variable": "bullet.position.y",
               "operator": "<",
               "value": -100
             },
             "then": [
               {
                 "type": "despawn",
                 "target": "bullet"
               }
             ]
           }
         ]
       }
     ]
   }
   ```

### Input Problems

#### Keys Not Responding

**Symptoms:**
- Key presses don't trigger actions
- Inconsistent input response
- Some keys work, others don't

**Solutions:**

1. **Check Key Names**
   ```json
   // ❌ Incorrect key names
   {
     "event": "on.key",
     "key": "spacebar"  // Should be "space"
   }
   
   // ✅ Correct key names
   {
     "event": "on.key",
     "key": "space"  // Correct
   }
   ```

   Common key names:
   - `space`, `enter`, `escape`, `tab`
   - `up`, `down`, `left`, `right`
   - `w`, `a`, `s`, `d`
   - `0`-`9`, `a`-`z`

2. **Check Focus**
   ```javascript
   // Ensure canvas has focus for keyboard input
   canvas.focus();
   canvas.tabIndex = 0;  // Make canvas focusable
   ```

3. **Prevent Default Browser Behavior**
   ```javascript
   // Prevent browser shortcuts from interfering
   const engine = new LLMRT.Engine(canvas, {
     preventContextMenu: true,
     captureKeyboard: true
   });
   ```

#### Touch/Mouse Issues

**Symptoms:**
- Clicks don't register
- Touch events not working on mobile
- Incorrect click positions

**Solutions:**

1. **Check Canvas Positioning**
   ```css
   /* Ensure canvas position is correct */
   canvas {
     position: relative;
     display: block;
   }
   ```

2. **Handle High DPI Displays**
   ```javascript
   // Engine automatically handles DPI scaling
   // But ensure CSS size matches canvas size
   canvas.style.width = canvas.width + 'px';
   canvas.style.height = canvas.height + 'px';
   ```

### Audio Problems

#### No Sound on Mobile

**Symptoms:**
- Audio works on desktop but not mobile
- First sound doesn't play
- Audio starts after user interaction

**Solutions:**

1. **Handle Audio Context Unlock**
   ```javascript
   // Audio requires user interaction on mobile
   document.addEventListener('touchstart', () => {
     engine.unlockAudio();
   }, { once: true });
   ```

2. **Use Appropriate Audio Formats**
   ```json
   // Provide multiple formats for compatibility
   {
     "id": "bgm",
     "url": "music.mp3",  // Fallback
     "formats": {
       "mp3": "music.mp3",
       "ogg": "music.ogg",
       "m4a": "music.m4a"
     }
   }
   ```

#### Audio Cutting Out

**Symptoms:**
- Sound effects stop playing
- Music stutters or stops
- Audio becomes distorted

**Solutions:**

1. **Limit Concurrent Audio**
   ```json
   // Don't play too many sounds at once
   {
     "type": "playSfx",
     "id": "explosion",
     "maxInstances": 3  // Limit concurrent plays
   }
   ```

2. **Use Appropriate Audio Settings**
   ```json
   {
     "id": "bgm",
     "url": "music.mp3",
     "type": "music",
     "volume": 0.7,
     "loop": true,
     "preload": true
   }
   ```

### Visual Issues

#### Sprites Not Displaying

**Symptoms:**
- Blank areas where sprites should be
- Console errors about missing textures
- Sprites appear as colored rectangles

**Solutions:**

1. **Check Asset Loading**
   ```javascript
   // Wait for assets to load
   engine.on('assetsLoaded', () => {
     console.log('All assets loaded successfully');
   });
   
   engine.on('assetError', (error) => {
     console.error('Asset failed to load:', error);
   });
   ```

2. **Verify Sprite Properties**
   ```json
   // ❌ Missing sprite reference
   {
     "id": "player",
     "type": "Sprite"
     // Missing "sprite" property
   }
   
   // ✅ Complete sprite node
   {
     "id": "player",
     "type": "Sprite",
     "sprite": "player_idle",  // Must match asset ID
     "transform": {
       "position": [400, 300],
       "alpha": 1  // Ensure it's visible
     },
     "visible": true
   }
   ```

#### Text Not Rendering

**Symptoms:**
- Text nodes don't appear
- Font appears as default system font
- Text is positioned incorrectly

**Solutions:**

1. **Check Font Loading**
   ```json
   // Ensure fonts are loaded
   {
     "fonts": [
       {
         "id": "gameFont",
         "family": "Press Start 2P",
         "url": "fonts/PressStart2P.woff2"
       }
     ]
   }
   ```

2. **Use Web-Safe Fonts as Fallback**
   ```json
   {
     "theme": {
       "font": {
         "family": "'Press Start 2P', monospace"  // Fallback to monospace
       }
     }
   }
   ```

#### Blurry Graphics

**Symptoms:**
- Sprites appear blurry or pixelated
- Text is not crisp
- Graphics look scaled incorrectly

**Solutions:**

1. **Handle High DPI Displays**
   ```javascript
   // Engine handles this automatically, but ensure proper CSS
   const dpr = window.devicePixelRatio || 1;
   canvas.width = 800 * dpr;
   canvas.height = 600 * dpr;
   canvas.style.width = '800px';
   canvas.style.height = '600px';
   ```

2. **Use Appropriate Image Sizes**
   ```json
   // Provide high-resolution assets
   {
     "id": "player",
     "url": "player@2x.png",  // 2x resolution
     "width": 32,  // Logical size
     "height": 32
   }
   ```

### Module Issues

#### Module Not Loading

**Symptoms:**
- Module-specific nodes don't render
- Module actions don't work
- Console errors about missing modules

**Solutions:**

1. **Check Module Import**
   ```javascript
   // Ensure modules are imported
   import { LLMRTEngine } from 'llmrt';
   import { Mode7Module } from 'llmrt/modules/mode7';
   
   const engine = new LLMRTEngine(canvas);
   engine.registerModule(new Mode7Module());
   ```

2. **Verify Module Dependencies**
   ```json
   // Check if module has dependencies
   {
     "modules": ["mode7", "postfx"],  // Ensure all required modules
     "scenes": [
       {
         "root": {
           "children": [
             {
               "type": "Mode7Plane",  // Requires mode7 module
               "texture": "ground"
             }
           ]
         }
       }
     ]
   }
   ```

## Debugging Tools

### Console Commands

Enable debug mode and use these console commands:

```javascript
// Enable debug mode
engine.enableDebugMode(true);

// Performance monitoring
console.log(engine.getPerformanceStats());

// Scene inspection
console.log(engine.getCurrentScene());

// Variable inspection
console.log(engine.getVariable('playerHealth'));

// Node tree inspection
engine.debugNodeTree();
```

### Browser Developer Tools

1. **Network Tab**: Check if assets are loading correctly
2. **Console Tab**: Look for JavaScript errors and warnings
3. **Performance Tab**: Profile frame rate and memory usage
4. **Application Tab**: Check local storage and cache

### CLI Validator

Use the command-line validator for thorough cartridge checking:

```bash
# Install the validator
npm install -g llmrt-validator

# Validate a cartridge
llmrt-validator my-game.lgf.json

# Validate with detailed output
llmrt-validator --verbose my-game.lgf.json

# Check multiple files
llmrt-validator games/*.lgf.json
```

### Playground Debugging

Use the interactive playground for rapid testing:

1. Open `playground.html` in your browser
2. Load your cartridge JSON
3. Use the built-in debugger tools
4. Test changes in real-time

## Performance Optimization

### Profiling

```javascript
// Enable performance profiling
const engine = new LLMRT.Engine(canvas, {
  debug: true,
  showStats: true
});

// Monitor specific metrics
engine.on('frameEnd', (stats) => {
  if (stats.frameTime > 16.67) {  // Slower than 60 FPS
    console.warn('Slow frame:', stats);
  }
});
```

### Optimization Checklist

- [ ] Keep node count under 1000 active nodes
- [ ] Limit particles to 200-500 maximum
- [ ] Use appropriate texture sizes (power of 2, under 1024x1024)
- [ ] Minimize `on.tick` triggers
- [ ] Use object pooling for frequently spawned/despawned objects
- [ ] Enable tree-shaking for unused modules
- [ ] Compress audio assets
- [ ] Use sprite atlases for multiple small images

## Getting Help

### Community Resources

- **GitHub Issues**: Report bugs and request features
- **Discord Server**: Real-time help and discussion
- **Documentation**: Complete API reference and guides
- **Examples**: Sample games and code snippets

### Reporting Bugs

When reporting issues, include:

1. **Minimal reproduction case**: Simplest cartridge that shows the problem
2. **Browser information**: Version, operating system
3. **Console output**: Any error messages or warnings
4. **Expected vs actual behavior**: What should happen vs what does happen

### Getting Support

1. **Check this troubleshooting guide first**
2. **Search existing GitHub issues**
3. **Use the CLI validator to check your cartridge**
4. **Test in the playground to isolate the issue**
5. **Create a minimal test case**
6. **Post in the community Discord or GitHub issues**

Remember: The more specific information you provide, the faster we can help solve your problem!