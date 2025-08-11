---
sidebar_position: 6
---

# LLM Canvas Engine Playground

The playground is an interactive development environment for testing and debugging LGF cartridges. It provides real-time editing, validation, performance monitoring, and build export capabilities.

## Features

### 1. Real-time Cartridge Editor
- Syntax-highlighted JSON editor for LGF cartridges
- Live validation with detailed error messages
- Auto-completion and formatting support

### 2. Sample Cartridge Loading
- Pre-loaded sample games (Pong, Raycast Corridor, Mode-7 Racer)
- File upload support for custom cartridges
- Quick-start templates

### 3. Performance Profiler
- Real-time FPS monitoring
- Frame time visualization
- Memory usage tracking
- Performance alerts and recommendations
- Detailed performance reports

### 4. Asset Preview and Debugging
- Visual preview of sprites, audio, and fonts
- Asset usage analysis
- Loading statistics and error reporting
- Interactive asset testing

### 5. Scene Tree Inspector
- Hierarchical view of scene nodes
- Node property inspection
- Real-time scene state monitoring

### 6. Build Export System
- Optimized build generation
- Multiple target platforms (web, mobile, desktop)
- Asset optimization and compression
- Tree-shaking for minimal bundle size

## Getting Started

1. **Open the Playground**
   ```bash
   npm run build:playground
   npm run playground
   ```
   Then navigate to `http://localhost:8080/dist/playground.html`

2. **Load a Sample Cartridge**
   - Use the "Load Sample..." dropdown to select a pre-built game
   - Or click "Load Cartridge" to upload your own LGF file

3. **Edit and Test**
   - Modify the cartridge JSON in the editor
   - Watch for validation feedback in real-time
   - Click "Run" to test your changes

4. **Monitor Performance**
   - Switch to the "Performance" tab to view metrics
   - Monitor FPS, frame time, and memory usage
   - Review performance recommendations

5. **Export Your Game**
   - Click "Export Build" to generate optimized files
   - Choose target platform and optimization settings
   - Download the generated build package

## Interface Overview

### Toolbar
- **Load Cartridge**: Upload LGF files from disk
- **Run/Stop/Reset**: Control game execution
- **Load Sample**: Quick access to example games
- **Export Build**: Generate optimized builds
- **Validate**: Manual validation trigger

### Editor Panel
- **Cartridge Editor**: JSON editor with syntax highlighting
- **Validation Panel**: Real-time error and warning display

### Debug Panel
- **Performance Tab**: FPS, frame time, and memory charts
- **Assets Tab**: Visual asset preview and statistics
- **Scene Tab**: Hierarchical scene tree view

### Console Panel
- Real-time logging and error messages
- Performance alerts and recommendations
- Build process feedback

## Performance Monitoring

The playground includes comprehensive performance monitoring:

### Metrics Tracked
- **Frame Rate**: Current and average FPS
- **Frame Time**: Time per frame in milliseconds
- **Memory Usage**: JavaScript heap usage
- **Render Time**: Time spent rendering each frame
- **Draw Calls**: Number of draw operations per frame

### Performance Alerts
- **Warning**: Performance degradation detected
- **Critical**: Severe performance issues requiring attention

### Optimization Recommendations
- Automatic suggestions based on performance data
- Asset optimization recommendations
- Code structure improvements

## Asset Management

### Supported Asset Types
- **Sprites**: PNG, JPEG, GIF, WebP, SVG
- **Audio**: MP3, WAV, OGG, AAC, M4A
- **Fonts**: WOFF, WOFF2, TTF, OTF, EOT

### Asset Analysis
- Loading time statistics
- Usage analysis (unused assets detection)
- Format recommendations
- Size optimization suggestions

## Build Export

### Export Options
- **Target Platform**: Web, Mobile, Desktop, Embed
- **Optimization Level**: Development, Production
- **Asset Bundling**: Inline or separate files
- **Module Selection**: Tree-shake unused features

### Generated Files
- **index.html**: Main game page
- **game.js**: Optimized game code
- **assets/**: Game assets (if not bundled)
- **manifest.json**: Web app manifest (mobile builds)
- **sw.js**: Service worker (offline support)

## Troubleshooting

### Common Issues

1. **Validation Errors**
   - Check JSON syntax for missing commas or brackets
   - Verify all required fields are present
   - Ensure asset URLs are accessible

2. **Performance Issues**
   - Reduce number of active sprites
   - Optimize asset sizes
   - Simplify complex animations

3. **Asset Loading Failures**
   - Check asset URLs and file formats
   - Verify CORS settings for external assets
   - Test asset accessibility

### Debug Tips
- Use the console panel for detailed error messages
- Monitor the performance tab during gameplay
- Check asset usage in the assets tab
- Validate cartridge structure before running

## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save current cartridge (downloads file)
- **Ctrl/Cmd + O**: Open file dialog
- **F5**: Run cartridge
- **Esc**: Stop running cartridge
- **Ctrl/Cmd + Shift + I**: Toggle debug panel

## Browser Compatibility

The playground supports modern browsers with:
- ES2020+ JavaScript support
- Canvas 2D API
- Web Audio API
- File API
- Local Storage

### Recommended Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development Mode

For development and debugging:

```bash
# Build in development mode (with source maps)
npm run build:dev

# Watch mode for automatic rebuilds
npm run build:dev -- --watch

# Run local server
python3 -m http.server 8080
```

## API Integration

The playground can be integrated into other tools:

```javascript
// Initialize playground programmatically
import { PlaygroundApp } from './dist/playground.js';

const playground = new PlaygroundApp();

// Load cartridge programmatically
playground.loadCartridgeFromData(cartridgeData);

// Export build programmatically
const buildResult = await playground.exportBuild(config);
```

## Contributing

To contribute to the playground:

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure cross-browser compatibility
5. Test with various cartridge formats

## License

The playground is part of the LLM Canvas Engine and follows the same MIT license.