---
sidebar_position: 8
---

# Theming Guide

LLMRT uses a unified theming system that ensures visual consistency across all games while maintaining accessibility standards. Themes are defined using design tokens that control colors, typography, spacing, and other visual properties.

## Theme Structure

Every cartridge includes a theme object that defines the visual style:

```json
{
  "theme": {
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#64748b",
      "background": "#0f172a",
      "text": "#f8fafc",
      "accent": "#10b981"
    },
    "font": {
      "family": "monospace",
      "sizes": {
        "small": 12,
        "medium": 16,
        "large": 24,
        "xlarge": 32
      }
    },
    "spacing": {
      "xs": 4,
      "small": 8,
      "medium": 16,
      "large": 32,
      "xlarge": 64
    },
    "radii": {
      "none": 0,
      "small": 4,
      "medium": 8,
      "large": 16,
      "full": 9999
    }
  }
}
```

## Color System

### Core Color Tokens

The color system uses semantic names that adapt to different visual styles:

```json
{
  "colors": {
    "primary": "#3b82f6",     // Main brand color
    "secondary": "#64748b",   // Secondary brand color
    "background": "#0f172a",  // Main background
    "text": "#f8fafc",        // Primary text color
    "accent": "#10b981"       // Highlight/accent color
  }
}
```

### Extended Color Palette

For more complex games, you can extend the color palette:

```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#64748b",
    "background": "#0f172a",
    "text": "#f8fafc",
    "accent": "#10b981",
    
    // Extended colors
    "success": "#22c55e",
    "warning": "#f59e0b",
    "error": "#ef4444",
    "info": "#06b6d4",
    
    // UI colors
    "surface": "#1e293b",
    "border": "#334155",
    "muted": "#64748b",
    
    // Game-specific colors
    "player": "#3b82f6",
    "enemy": "#ef4444",
    "powerup": "#f59e0b",
    "health": "#22c55e"
  }
}
```

### Using Colors in Nodes

Colors can be referenced by their token names:

```json
{
  "id": "healthBar",
  "type": "Sprite",
  "tint": "success",  // Uses theme.colors.success
  "transform": {
    "position": [10, 10]
  }
}
```

```json
{
  "id": "scoreText",
  "type": "Text",
  "text": "Score: 0",
  "color": "text",    // Uses theme.colors.text
  "fontSize": "large"
}
```

## Typography System

### Font Configuration

```json
{
  "font": {
    "family": "monospace",  // Font family
    "sizes": {
      "xs": 10,
      "small": 12,
      "medium": 16,
      "large": 24,
      "xlarge": 32,
      "xxlarge": 48
    }
  }
}
```

### Font Family Options

Common web-safe font families:

- `"monospace"` - Fixed-width fonts (Courier, Monaco)
- `"sans-serif"` - Clean, modern fonts (Arial, Helvetica)
- `"serif"` - Traditional fonts with serifs (Times, Georgia)
- `"cursive"` - Decorative fonts
- `"fantasy"` - Stylized fonts

### Custom Fonts

You can also specify custom fonts:

```json
{
  "font": {
    "family": "'Press Start 2P', monospace",  // Retro pixel font
    "sizes": {
      "small": 8,
      "medium": 12,
      "large": 16
    }
  }
}
```

### Using Typography

```json
{
  "id": "title",
  "type": "Text",
  "text": "Game Title",
  "fontSize": "xlarge",  // Uses theme.font.sizes.xlarge
  "color": "primary"
}
```

## Spacing System

### Spacing Tokens

Consistent spacing creates visual harmony:

```json
{
  "spacing": {
    "xs": 2,
    "small": 4,
    "medium": 8,
    "large": 16,
    "xlarge": 32,
    "xxlarge": 64
  }
}
```

### Using Spacing

Spacing tokens are used for positioning and layout:

```json
{
  "id": "menuButton",
  "type": "Button",
  "text": "Start Game",
  "padding": ["medium", "small"],  // [horizontal, vertical]
  "transform": {
    "position": [400, 300]
  }
}
```

## Border Radius System

### Radius Tokens

Control the roundness of UI elements:

```json
{
  "radii": {
    "none": 0,
    "small": 4,
    "medium": 8,
    "large": 16,
    "xlarge": 24,
    "full": 9999  // Fully rounded
  }
}
```

## Theme Presets

### Retro/Pixel Theme

Perfect for 8-bit and 16-bit style games:

```json
{
  "theme": {
    "colors": {
      "primary": "#00ff00",
      "secondary": "#ffff00",
      "background": "#000000",
      "text": "#ffffff",
      "accent": "#ff00ff"
    },
    "font": {
      "family": "'Press Start 2P', monospace",
      "sizes": {
        "small": 8,
        "medium": 12,
        "large": 16,
        "xlarge": 24
      }
    },
    "spacing": {
      "small": 4,
      "medium": 8,
      "large": 16,
      "xlarge": 32
    },
    "radii": {
      "none": 0,
      "small": 2,
      "medium": 4,
      "large": 8
    }
  }
}
```

### Modern/Clean Theme

For contemporary, polished games:

```json
{
  "theme": {
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#64748b",
      "background": "#f8fafc",
      "text": "#0f172a",
      "accent": "#10b981"
    },
    "font": {
      "family": "'Inter', sans-serif",
      "sizes": {
        "small": 14,
        "medium": 18,
        "large": 28,
        "xlarge": 42
      }
    },
    "spacing": {
      "small": 8,
      "medium": 16,
      "large": 24,
      "xlarge": 48
    },
    "radii": {
      "small": 6,
      "medium": 12,
      "large": 18,
      "full": 9999
    }
  }
}
```

### Dark/Cyberpunk Theme

For futuristic, high-contrast games:

```json
{
  "theme": {
    "colors": {
      "primary": "#00ffff",
      "secondary": "#ff00ff",
      "background": "#0a0a0a",
      "text": "#00ff00",
      "accent": "#ffff00"
    },
    "font": {
      "family": "'Orbitron', monospace",
      "sizes": {
        "small": 12,
        "medium": 16,
        "large": 24,
        "xlarge": 36
      }
    },
    "spacing": {
      "small": 6,
      "medium": 12,
      "large": 24,
      "xlarge": 48
    },
    "radii": {
      "none": 0,
      "small": 2,
      "medium": 4,
      "large": 8
    }
  }
}
```

### Pastel/Cute Theme

For friendly, approachable games:

```json
{
  "theme": {
    "colors": {
      "primary": "#f472b6",
      "secondary": "#a78bfa",
      "background": "#fef3c7",
      "text": "#374151",
      "accent": "#34d399"
    },
    "font": {
      "family": "'Comic Sans MS', cursive",
      "sizes": {
        "small": 14,
        "medium": 18,
        "large": 26,
        "xlarge": 38
      }
    },
    "spacing": {
      "small": 8,
      "medium": 16,
      "large": 24,
      "xlarge": 40
    },
    "radii": {
      "small": 8,
      "medium": 16,
      "large": 24,
      "full": 9999
    }
  }
}
```

## Accessibility Considerations

### Color Contrast

LLMRT automatically ensures your theme meets accessibility standards:

- Text on background must have 4.5:1 contrast ratio minimum
- Large text (18pt+) must have 3:1 contrast ratio minimum
- Interactive elements must have sufficient contrast

### High Contrast Mode

You can define a high-contrast variant:

```json
{
  "theme": {
    "colors": {
      "primary": "#0066cc",
      "secondary": "#666666",
      "background": "#ffffff",
      "text": "#000000",
      "accent": "#cc0000"
    },
    "highContrast": {
      "primary": "#0000ff",
      "secondary": "#000000",
      "background": "#ffffff",
      "text": "#000000",
      "accent": "#ff0000"
    }
  }
}
```

### Text Scaling

Themes support text scaling for vision accessibility:

```json
{
  "font": {
    "family": "sans-serif",
    "sizes": {
      "small": 14,
      "medium": 18,
      "large": 24
    },
    "scaleFactors": {
      "normal": 1.0,
      "large": 1.25,
      "xlarge": 1.5
    }
  }
}
```

## Dynamic Theming

### Theme Variables

You can use variables in your theme for dynamic changes:

```json
{
  "variables": {
    "isDarkMode": true,
    "accentHue": 200
  },
  "theme": {
    "colors": {
      "background": "isDarkMode ? '#0f172a' : '#ffffff'",
      "text": "isDarkMode ? '#ffffff' : '#000000'",
      "accent": "hsl(accentHue, 70%, 50%)"
    }
  }
}
```

### Runtime Theme Changes

Change theme properties during gameplay:

```json
{
  "type": "setVar",
  "name": "theme.colors.accent",
  "value": "#ff0000"
}
```

## Module-Specific Theming

### Mode-7 Theming

```json
{
  "theme": {
    "mode7": {
      "fogColor": "#87ceeb",
      "horizonColor": "#ffd700",
      "groundTint": "#90ee90"
    }
  }
}
```

### Raycast Theming

```json
{
  "theme": {
    "raycast": {
      "fogColor": "#2d3748",
      "floorColor": "#4a5568",
      "ceilingColor": "#1a202c"
    }
  }
}
```

### Post-FX Theming

```json
{
  "theme": {
    "postfx": {
      "vignetteColor": "#000000",
      "bloomTint": "#ffffff",
      "colorGradeWarmth": 0.1
    }
  }
}
```

## Best Practices

### Consistency
- Use semantic color names (primary, secondary) rather than specific colors (blue, red)
- Maintain consistent spacing throughout your game
- Use a limited color palette (5-7 colors maximum)

### Accessibility
- Test your theme with high contrast mode
- Ensure sufficient color contrast for text
- Provide alternative visual cues beyond color

### Performance
- Avoid too many theme tokens - they increase bundle size
- Use CSS custom properties for dynamic themes
- Cache theme calculations when possible

### Maintainability
- Document your color choices and their meanings
- Use descriptive names for custom colors
- Keep theme definitions separate from game logic

## Testing Your Theme

### Contrast Checker

Use the built-in contrast checker:

```javascript
const engine = new LLMRT.Engine(canvas);
const contrastReport = engine.validateThemeContrast(theme);
console.log(contrastReport);
```

### Theme Preview

Test your theme in the playground:

```html
<script>
// Load your theme in the playground
playground.setTheme(myCustomTheme);
</script>
```

### Accessibility Testing

Enable accessibility testing mode:

```javascript
const engine = new LLMRT.Engine(canvas, {
  accessibility: {
    highContrast: true,
    textScale: 1.25,
    reducedMotion: false
  }
});
```

## Common Theme Patterns

### Game State Themes

Different themes for different game states:

```json
{
  "themes": {
    "menu": {
      "colors": {
        "primary": "#3b82f6",
        "background": "#0f172a"
      }
    },
    "gameplay": {
      "colors": {
        "primary": "#ef4444",
        "background": "#000000"
      }
    },
    "gameOver": {
      "colors": {
        "primary": "#64748b",
        "background": "#1e293b"
      }
    }
  }
}
```

### Responsive Themes

Themes that adapt to screen size:

```json
{
  "theme": {
    "font": {
      "sizes": {
        "small": "min(12px, 2vw)",
        "medium": "min(16px, 3vw)",
        "large": "min(24px, 4vw)"
      }
    },
    "spacing": {
      "small": "min(8px, 1vw)",
      "medium": "min(16px, 2vw)"
    }
  }
}
```

The theming system in LLMRT provides powerful tools for creating visually consistent and accessible games. By following these guidelines and using the provided tokens, you can create beautiful games that work well for all players.