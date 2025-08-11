/**
 * Unit tests for LGF Cartridge Validation System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LGFValidator, validateCartridge, ValidationResult } from './validator.js';

describe('LGFValidator', () => {
  let validator: LGFValidator;

  beforeEach(() => {
    validator = new LGFValidator();
  });

  describe('Basic Structure Validation', () => {
    it('should reject non-object input', () => {
      const result = validator.validate('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_ROOT_TYPE');
      expect(result.errors[0].message).toContain('must be a JSON object');
    });

    it('should reject null input', () => {
      const result = validator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_ROOT_TYPE');
    });

    it('should require all mandatory root properties', () => {
      const result = validator.validate({});
      expect(result.valid).toBe(false);
      
      const errorCodes = result.errors.map(e => e.code);
      expect(errorCodes).toContain('MISSING_REQUIRED_PROPERTY');
      
      const missingProps = result.errors
        .filter(e => e.code === 'MISSING_REQUIRED_PROPERTY')
        .map(e => e.path);
      
      expect(missingProps).toContain('version');
      expect(missingProps).toContain('metadata');
      expect(missingProps).toContain('theme');
      expect(missingProps).toContain('scenes');
      expect(missingProps).toContain('assets');
    });

    it('should reject unknown root properties', () => {
      const cartridge = {
        version: '1.0',
        metadata: { title: 'Test', author: 'Test', description: 'Test' },
        theme: createValidTheme(),
        scenes: [createValidScene()],
        assets: createValidAssets(),
        unknownProperty: 'should not be here'
      };

      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const unknownPropError = result.errors.find(e => e.code === 'UNKNOWN_PROPERTY');
      expect(unknownPropError).toBeDefined();
      expect(unknownPropError?.path).toBe('unknownProperty');
    });
  });

  describe('Version Validation', () => {
    it('should accept version 1.0', () => {
      const cartridge = createValidCartridge();
      const result = validator.validate(cartridge);
      
      const versionErrors = result.errors.filter(e => e.path === 'version');
      expect(versionErrors).toHaveLength(0);
    });

    it('should reject invalid versions', () => {
      const cartridge = createValidCartridge();
      cartridge.version = '2.0';
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const versionError = result.errors.find(e => e.code === 'INVALID_VERSION');
      expect(versionError).toBeDefined();
      expect(versionError?.suggestion).toContain('1.0');
    });
  });

  describe('Metadata Validation', () => {
    it('should require metadata to be an object', () => {
      const cartridge = createValidCartridge();
      cartridge.metadata = 'not an object' as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const metadataError = result.errors.find(e => e.code === 'INVALID_METADATA_TYPE');
      expect(metadataError).toBeDefined();
    });

    it('should require all metadata fields', () => {
      const cartridge = createValidCartridge();
      cartridge.metadata = {};
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const missingFields = result.errors
        .filter(e => e.code === 'MISSING_METADATA_FIELD')
        .map(e => e.path);
      
      expect(missingFields).toContain('metadata.title');
      expect(missingFields).toContain('metadata.author');
      expect(missingFields).toContain('metadata.description');
    });

    it('should reject empty metadata strings', () => {
      const cartridge = createValidCartridge();
      cartridge.metadata = {
        title: '',
        author: 'Valid Author',
        description: 'Valid Description'
      };
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const emptyFieldError = result.errors.find(e => 
        e.code === 'INVALID_METADATA_VALUE' && e.path === 'metadata.title'
      );
      expect(emptyFieldError).toBeDefined();
    });
  });

  describe('Theme Validation', () => {
    it('should require theme to be an object', () => {
      const cartridge = createValidCartridge();
      cartridge.theme = 'not an object' as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const themeError = result.errors.find(e => e.code === 'INVALID_THEME_TYPE');
      expect(themeError).toBeDefined();
    });

    it('should require all color properties', () => {
      const cartridge = createValidCartridge();
      cartridge.theme.colors = { primary: '#FF0000' } as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const missingColors = result.errors
        .filter(e => e.code === 'MISSING_THEME_COLOR')
        .map(e => e.path.split('.').pop());
      
      expect(missingColors).toContain('secondary');
      expect(missingColors).toContain('background');
      expect(missingColors).toContain('text');
      expect(missingColors).toContain('accent');
    });

    it('should validate color formats', () => {
      const cartridge = createValidCartridge();
      cartridge.theme.colors.primary = 'invalid-color';
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const colorError = result.errors.find(e => e.code === 'INVALID_COLOR_FORMAT');
      expect(colorError).toBeDefined();
      expect(colorError?.suggestion).toContain('hex color format');
    });

    it('should accept valid hex colors', () => {
      const cartridge = createValidCartridge();
      cartridge.theme.colors = {
        primary: '#FF0000',
        secondary: '#00FF00',
        background: '#0000FF',
        text: '#FFF',
        accent: '#FF00FF80' // With alpha
      };
      
      const result = validator.validate(cartridge);
      const colorErrors = result.errors.filter(e => e.code === 'INVALID_COLOR_FORMAT');
      expect(colorErrors).toHaveLength(0);
    });
  });

  describe('Scene Validation', () => {
    it('should require scenes to be an array', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes = 'not an array' as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const scenesError = result.errors.find(e => e.code === 'INVALID_SCENES_TYPE');
      expect(scenesError).toBeDefined();
    });

    it('should require at least one scene', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes = [];
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const noScenesError = result.errors.find(e => e.code === 'NO_SCENES');
      expect(noScenesError).toBeDefined();
    });

    it('should detect duplicate scene IDs', () => {
      const cartridge = createValidCartridge();
      const scene1 = createValidScene();
      const scene2 = createValidScene();
      scene1.id = 'duplicate';
      scene2.id = 'duplicate';
      cartridge.scenes = [scene1, scene2];
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const duplicateError = result.errors.find(e => e.code === 'DUPLICATE_SCENE_ID');
      expect(duplicateError).toBeDefined();
    });

    it('should validate scene ID format', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].id = '123-invalid'; // Can't start with number
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const formatError = result.errors.find(e => e.code === 'INVALID_ID_FORMAT');
      expect(formatError).toBeDefined();
    });

    it('should accept valid scene ID formats', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].id = 'valid_scene-123';
      
      const result = validator.validate(cartridge);
      const idErrors = result.errors.filter(e => e.code === 'INVALID_ID_FORMAT');
      expect(idErrors).toHaveLength(0);
    });
  });

  describe('Node Validation', () => {
    it('should require all node properties', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root = { id: 'test' } as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const missingProps = result.errors
        .filter(e => e.code === 'MISSING_NODE_PROPERTY')
        .map(e => e.path.split('.').pop());
      
      expect(missingProps).toContain('type');
      expect(missingProps).toContain('transform');
      expect(missingProps).toContain('visible');
      expect(missingProps).toContain('children');
      expect(missingProps).toContain('actions');
      expect(missingProps).toContain('triggers');
    });

    it('should validate node types', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.type = 'InvalidType' as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const typeError = result.errors.find(e => e.code === 'INVALID_NODE_TYPE_VALUE');
      expect(typeError).toBeDefined();
      expect(typeError?.suggestion).toContain('Group');
    });

    it('should validate node ID format', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.id = '123invalid';
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const idError = result.errors.find(e => e.code === 'INVALID_NODE_ID');
      expect(idError).toBeDefined();
    });
  });

  describe('Transform Validation', () => {
    it('should require all transform properties', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.transform = { position: { x: 0, y: 0 } } as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const missingProps = result.errors
        .filter(e => e.code === 'MISSING_TRANSFORM_PROPERTY')
        .map(e => e.path.split('.').pop());
      
      expect(missingProps).toContain('scale');
      expect(missingProps).toContain('rotation');
      expect(missingProps).toContain('skew');
      expect(missingProps).toContain('alpha');
    });

    it('should validate alpha range', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.transform.alpha = 1.5; // Invalid range
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const alphaError = result.errors.find(e => e.code === 'INVALID_ALPHA_VALUE');
      expect(alphaError).toBeDefined();
      expect(alphaError?.suggestion).toContain('between 0');
    });

    it('should validate Vector2 properties', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.transform.position = { x: 'invalid' } as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const vectorErrors = result.errors.filter(e => 
        e.code === 'MISSING_VECTOR_PROPERTY' || e.code === 'INVALID_VECTOR_VALUE'
      );
      expect(vectorErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Action Validation', () => {
    it('should require action type and params', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.actions = [{}] as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const actionErrors = result.errors.filter(e => 
        e.code === 'MISSING_ACTION_TYPE' || e.code === 'MISSING_ACTION_PARAMS'
      );
      expect(actionErrors.length).toBe(2);
    });

    it('should validate action types', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.actions = [{
        type: 'invalidAction',
        params: {}
      }] as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const typeError = result.errors.find(e => e.code === 'INVALID_ACTION_TYPE_VALUE');
      expect(typeError).toBeDefined();
      expect(typeError?.suggestion).toContain('gotoScene');
    });

    it('should accept valid action types', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.actions = [{
        type: 'gotoScene',
        params: { sceneId: 'test' }
      }];
      
      const result = validator.validate(cartridge);
      const actionErrors = result.errors.filter(e => e.code === 'INVALID_ACTION_TYPE_VALUE');
      expect(actionErrors).toHaveLength(0);
    });
  });

  describe('Trigger Validation', () => {
    it('should require trigger event and actions', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.triggers = [{}] as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const triggerErrors = result.errors.filter(e => 
        e.code === 'MISSING_TRIGGER_EVENT' || e.code === 'MISSING_TRIGGER_ACTIONS'
      );
      expect(triggerErrors.length).toBe(2);
    });

    it('should validate trigger events', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.triggers = [{
        event: 'invalidEvent',
        actions: []
      }] as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const eventError = result.errors.find(e => e.code === 'INVALID_TRIGGER_EVENT');
      expect(eventError).toBeDefined();
      expect(eventError?.suggestion).toContain('on.start');
    });

    it('should accept valid trigger events', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.triggers = [{
        event: 'on.start',
        actions: [{
          type: 'setVar',
          params: { name: 'test', value: 1 }
        }]
      }];
      
      const result = validator.validate(cartridge);
      const triggerErrors = result.errors.filter(e => e.code === 'INVALID_TRIGGER_EVENT');
      expect(triggerErrors).toHaveLength(0);
    });
  });

  describe('Asset Validation', () => {
    it('should require all asset types', () => {
      const cartridge = createValidCartridge();
      cartridge.assets = {} as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const missingAssets = result.errors
        .filter(e => e.code === 'MISSING_ASSET_TYPE')
        .map(e => e.path.split('.').pop());
      
      expect(missingAssets).toContain('sprites');
      expect(missingAssets).toContain('audio');
      expect(missingAssets).toContain('fonts');
    });

    it('should require asset arrays', () => {
      const cartridge = createValidCartridge();
      cartridge.assets.sprites = 'not an array' as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const formatError = result.errors.find(e => e.code === 'INVALID_ASSET_TYPE_FORMAT');
      expect(formatError).toBeDefined();
    });
  });

  describe('Variables Validation', () => {
    it('should accept valid variable types', () => {
      const cartridge = createValidCartridge();
      cartridge.variables = {
        score: 100,
        playerName: 'Test Player',
        gameStarted: true
      };
      
      const result = validator.validate(cartridge);
      const variableErrors = result.errors.filter(e => e.code === 'INVALID_VARIABLE_TYPE');
      expect(variableErrors).toHaveLength(0);
    });

    it('should reject invalid variable types', () => {
      const cartridge = createValidCartridge();
      cartridge.variables = {
        invalidVar: { nested: 'object' }
      } as any;
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(false);
      
      const variableError = result.errors.find(e => e.code === 'INVALID_VARIABLE_TYPE');
      expect(variableError).toBeDefined();
      expect(variableError?.suggestion).toContain('numbers, strings, or booleans');
    });
  });

  describe('Semantic Validation and Warnings', () => {
    it('should warn about empty scenes', () => {
      const cartridge = createValidCartridge();
      cartridge.scenes[0].root.children = [];
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const emptySceneWarning = result.warnings.find(w => 
        w.message.includes('no child nodes')
      );
      expect(emptySceneWarning).toBeDefined();
    });

    it('should warn about large sprite counts', () => {
      const cartridge = createValidCartridge();
      // Create many sprites
      cartridge.assets.sprites = Array.from({ length: 150 }, (_, i) => ({
        id: `sprite${i}`,
        url: `sprite${i}.png`,
        width: 32,
        height: 32
      }));
      
      const result = validator.validate(cartridge);
      expect(result.valid).toBe(true);
      
      const performanceWarning = result.warnings.find(w => 
        w.message.includes('Large number of sprites')
      );
      expect(performanceWarning).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle deeply nested node structures', () => {
      const cartridge = createValidCartridge();
      let currentNode = cartridge.scenes[0].root;
      
      // Create deep nesting
      for (let i = 0; i < 10; i++) {
        const childNode = createValidNode(`child${i}`);
        currentNode.children = [childNode];
        currentNode = childNode;
      }
      
      const result = validator.validate(cartridge);
      // Should not crash and should validate the structure
      expect(result).toBeDefined();
    });

    it('should handle validation exceptions gracefully', () => {
      // Create a circular reference that might cause issues
      const cartridge = createValidCartridge();
      const circularObj: any = { test: 'value' };
      circularObj.self = circularObj;
      
      // This should not crash the validator
      const result = validator.validate(circularObj);
      expect(result).toBeDefined();
      expect(result.valid).toBe(false);
    });
  });

  describe('Convenience Function', () => {
    it('should work with validateCartridge function', () => {
      const cartridge = createValidCartridge();
      const result = validateCartridge(cartridge);
      
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

// Helper functions for creating valid test data
function createValidCartridge() {
  return {
    version: '1.0',
    metadata: {
      title: 'Test Game',
      author: 'Test Author',
      description: 'A test game cartridge'
    },
    theme: createValidTheme(),
    scenes: [createValidScene()],
    assets: createValidAssets(),
    variables: {
      score: 0,
      level: 1
    }
  };
}

function createValidTheme() {
  return {
    colors: {
      primary: '#FF0000',
      secondary: '#00FF00',
      background: '#0000FF',
      text: '#FFFFFF',
      accent: '#FFFF00'
    },
    font: {
      family: 'Arial',
      sizes: {
        small: 12,
        medium: 16,
        large: 24
      }
    },
    spacing: {
      small: 4,
      medium: 8,
      large: 16
    },
    radii: {
      small: 2,
      medium: 4,
      large: 8
    }
  };
}

function createValidScene() {
  return {
    id: 'testScene',
    root: createValidNode('root')
  };
}

function createValidNode(id: string) {
  return {
    id,
    type: 'Group',
    transform: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    },
    visible: true,
    children: [],
    actions: [],
    triggers: []
  };
}

function createValidAssets() {
  return {
    sprites: [
      {
        id: 'testSprite',
        url: 'test.png',
        width: 32,
        height: 32,
        frames: 1
      }
    ],
    audio: [
      {
        id: 'testSound',
        url: 'test.wav',
        type: 'sfx'
      }
    ],
    fonts: [
      {
        id: 'testFont',
        family: 'Test Font',
        url: 'test.woff2'
      }
    ]
  };
}