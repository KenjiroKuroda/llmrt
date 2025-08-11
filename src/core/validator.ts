/**
 * LGF Cartridge Validation System
 * Provides schema validation with actionable error messages
 */

import { LGFCartridge } from '../types/core.js';

export interface ValidationError {
  path: string;
  message: string;
  suggestion?: string;
  code: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Simple JSON Schema validator implementation
 * Focused on LGF schema validation with actionable error messages
 */
export class LGFValidator {
  constructor() {
    // Custom validator implementation - doesn't need schema object
  }

  /**
   * Validate a cartridge against the LGF schema
   */
  validate(cartridge: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic structure validation
      this.validateStructure(cartridge, '', errors);
      
      // Semantic validation
      if (errors.length === 0) {
        this.validateSemantics(cartridge, warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push({
        path: '',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR'
      });

      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  private validateStructure(obj: any, path: string, errors: ValidationError[]): void {
    // Root level validation
    if (path === '') {
      if (typeof obj !== 'object' || obj === null) {
        errors.push({
          path: '',
          message: 'Cartridge must be a JSON object',
          suggestion: 'Ensure your cartridge is a valid JSON object with required properties',
          code: 'INVALID_ROOT_TYPE'
        });
        return;
      }

      // Check required root properties
      const requiredProps = ['version', 'metadata', 'theme', 'scenes', 'assets'];
      for (const prop of requiredProps) {
        if (!(prop in obj)) {
          errors.push({
            path: prop,
            message: `Missing required property: ${prop}`,
            suggestion: `Add the "${prop}" property to your cartridge`,
            code: 'MISSING_REQUIRED_PROPERTY'
          });
        }
      }

      // Check for unknown properties
      const allowedProps = [...requiredProps, 'variables'];
      for (const prop in obj) {
        if (!allowedProps.includes(prop)) {
          errors.push({
            path: prop,
            message: `Unknown property: ${prop}`,
            suggestion: `Remove "${prop}" or check for typos. Allowed properties: ${allowedProps.join(', ')}`,
            code: 'UNKNOWN_PROPERTY'
          });
        }
      }

      // Validate each property if present
      if (obj.version !== undefined) {
        this.validateStructure(obj.version, 'version', errors);
      }
      if (obj.metadata !== undefined) {
        this.validateStructure(obj.metadata, 'metadata', errors);
      }
      if (obj.theme !== undefined) {
        this.validateStructure(obj.theme, 'theme', errors);
      }
      if (obj.scenes !== undefined) {
        this.validateStructure(obj.scenes, 'scenes', errors);
      }
      if (obj.assets !== undefined) {
        this.validateStructure(obj.assets, 'assets', errors);
      }
      if (obj.variables !== undefined) {
        this.validateStructure(obj.variables, 'variables', errors);
      }
      return;
    }

    // Version validation
    if (path === 'version') {
      if (obj !== '1.0') {
        errors.push({
          path: 'version',
          message: `Invalid version: ${obj}`,
          suggestion: 'Use version "1.0"',
          code: 'INVALID_VERSION'
        });
      }
      return;
    }

    // Metadata validation
    if (path === 'metadata') {
      this.validateMetadata(obj, errors);
      return;
    }

    // Theme validation
    if (path === 'theme') {
      this.validateTheme(obj, errors);
      return;
    }

    // Scenes validation
    if (path === 'scenes') {
      this.validateScenes(obj, errors);
      return;
    }

    // Assets validation
    if (path === 'assets') {
      this.validateAssets(obj, errors);
      return;
    }

    // Variables validation
    if (path === 'variables') {
      this.validateVariables(obj, errors);
      return;
    }
  }

  private validateMetadata(metadata: any, errors: ValidationError[]): void {
    if (typeof metadata !== 'object' || metadata === null) {
      errors.push({
        path: 'metadata',
        message: 'Metadata must be an object',
        suggestion: 'Provide metadata with title, author, and description',
        code: 'INVALID_METADATA_TYPE'
      });
      return;
    }

    const requiredFields = ['title', 'author', 'description'];
    for (const field of requiredFields) {
      if (!(field in metadata)) {
        errors.push({
          path: `metadata.${field}`,
          message: `Missing required metadata field: ${field}`,
          suggestion: `Add "${field}" to your metadata`,
          code: 'MISSING_METADATA_FIELD'
        });
      } else if (typeof metadata[field] !== 'string' || metadata[field].length === 0) {
        errors.push({
          path: `metadata.${field}`,
          message: `Metadata ${field} must be a non-empty string`,
          suggestion: `Provide a valid ${field} string`,
          code: 'INVALID_METADATA_VALUE'
        });
      }
    }
  }

  private validateTheme(theme: any, errors: ValidationError[]): void {
    if (typeof theme !== 'object' || theme === null) {
      errors.push({
        path: 'theme',
        message: 'Theme must be an object',
        suggestion: 'Provide theme with colors, font, spacing, and radii',
        code: 'INVALID_THEME_TYPE'
      });
      return;
    }

    // Validate colors
    if (!theme.colors || typeof theme.colors !== 'object') {
      errors.push({
        path: 'theme.colors',
        message: 'Theme colors must be an object',
        suggestion: 'Provide colors object with primary, secondary, background, text, and accent',
        code: 'INVALID_THEME_COLORS'
      });
    } else {
      const requiredColors = ['primary', 'secondary', 'background', 'text', 'accent'];
      for (const color of requiredColors) {
        if (!(color in theme.colors)) {
          errors.push({
            path: `theme.colors.${color}`,
            message: `Missing required color: ${color}`,
            suggestion: `Add "${color}" color to your theme`,
            code: 'MISSING_THEME_COLOR'
          });
        } else if (!this.isValidColor(theme.colors[color])) {
          errors.push({
            path: `theme.colors.${color}`,
            message: `Invalid color format: ${theme.colors[color]}`,
            suggestion: 'Use hex color format like #FF0000 or #F00',
            code: 'INVALID_COLOR_FORMAT'
          });
        }
      }
    }

    // Validate font
    if (!theme.font || typeof theme.font !== 'object') {
      errors.push({
        path: 'theme.font',
        message: 'Theme font must be an object',
        suggestion: 'Provide font object with family and sizes',
        code: 'INVALID_THEME_FONT'
      });
    }

    // Validate spacing and radii
    ['spacing', 'radii'].forEach(prop => {
      if (!theme[prop] || typeof theme[prop] !== 'object') {
        errors.push({
          path: `theme.${prop}`,
          message: `Theme ${prop} must be an object`,
          suggestion: `Provide ${prop} object with numeric values`,
          code: 'INVALID_THEME_PROPERTY'
        });
      }
    });
  }

  private validateScenes(scenes: any, errors: ValidationError[]): void {
    if (!Array.isArray(scenes)) {
      errors.push({
        path: 'scenes',
        message: 'Scenes must be an array',
        suggestion: 'Provide an array of scene objects',
        code: 'INVALID_SCENES_TYPE'
      });
      return;
    }

    if (scenes.length === 0) {
      errors.push({
        path: 'scenes',
        message: 'At least one scene is required',
        suggestion: 'Add at least one scene to your cartridge',
        code: 'NO_SCENES'
      });
      return;
    }

    const sceneIds = new Set<string>();
    scenes.forEach((scene, index) => {
      if (typeof scene !== 'object' || scene === null) {
        errors.push({
          path: `scenes[${index}]`,
          message: 'Scene must be an object',
          suggestion: 'Provide scene object with id and root node',
          code: 'INVALID_SCENE_TYPE'
        });
        return;
      }

      if (!scene.id || typeof scene.id !== 'string') {
        errors.push({
          path: `scenes[${index}].id`,
          message: 'Scene id must be a non-empty string',
          suggestion: 'Provide a unique scene identifier',
          code: 'INVALID_SCENE_ID'
        });
      } else {
        if (sceneIds.has(scene.id)) {
          errors.push({
            path: `scenes[${index}].id`,
            message: `Duplicate scene id: ${scene.id}`,
            suggestion: 'Use unique scene identifiers',
            code: 'DUPLICATE_SCENE_ID'
          });
        }
        sceneIds.add(scene.id);

        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(scene.id)) {
          errors.push({
            path: `scenes[${index}].id`,
            message: `Invalid scene id format: ${scene.id}`,
            suggestion: 'Scene ids must start with a letter and contain only letters, numbers, underscores, and hyphens',
            code: 'INVALID_ID_FORMAT'
          });
        }
      }

      if (!scene.root) {
        errors.push({
          path: `scenes[${index}].root`,
          message: 'Scene must have a root node',
          suggestion: 'Provide a root node for the scene',
          code: 'MISSING_SCENE_ROOT'
        });
      } else {
        this.validateNode(scene.root, `scenes[${index}].root`, errors);
      }
    });
  }

  private validateNode(node: any, path: string, errors: ValidationError[]): void {
    if (typeof node !== 'object' || node === null) {
      errors.push({
        path,
        message: 'Node must be an object',
        suggestion: 'Provide node object with required properties',
        code: 'INVALID_NODE_TYPE'
      });
      return;
    }

    // Validate required properties
    const requiredProps = ['id', 'type', 'transform', 'visible', 'children', 'actions', 'triggers'];
    for (const prop of requiredProps) {
      if (!(prop in node)) {
        errors.push({
          path: `${path}.${prop}`,
          message: `Missing required node property: ${prop}`,
          suggestion: `Add "${prop}" to your node`,
          code: 'MISSING_NODE_PROPERTY'
        });
      }
    }

    // Validate node id
    if (node.id && (typeof node.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(node.id))) {
      errors.push({
        path: `${path}.id`,
        message: `Invalid node id format: ${node.id}`,
        suggestion: 'Node ids must start with a letter and contain only letters, numbers, underscores, and hyphens',
        code: 'INVALID_NODE_ID'
      });
    }

    // Validate node type
    const validNodeTypes = [
      'Group', 'Sprite', 'Text', 'Button', 'Camera2D', 
      'Particles2D', 'PostChain', 'Mode7Plane', 'RaycastMap', 'TilemapIso'
    ];
    if (node.type && !validNodeTypes.includes(node.type)) {
      errors.push({
        path: `${path}.type`,
        message: `Invalid node type: ${node.type}`,
        suggestion: `Use one of: ${validNodeTypes.join(', ')}`,
        code: 'INVALID_NODE_TYPE_VALUE'
      });
    }

    // Validate transform
    if (node.transform) {
      this.validateTransform(node.transform, `${path}.transform`, errors);
    }

    // Validate children
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any, index: number) => {
        this.validateNode(child, `${path}.children[${index}]`, errors);
      });
    }

    // Validate actions
    if (node.actions && Array.isArray(node.actions)) {
      node.actions.forEach((action: any, index: number) => {
        this.validateAction(action, `${path}.actions[${index}]`, errors);
      });
    }

    // Validate triggers
    if (node.triggers && Array.isArray(node.triggers)) {
      node.triggers.forEach((trigger: any, index: number) => {
        this.validateTrigger(trigger, `${path}.triggers[${index}]`, errors);
      });
    }
  }

  private validateTransform(transform: any, path: string, errors: ValidationError[]): void {
    if (typeof transform !== 'object' || transform === null) {
      errors.push({
        path,
        message: 'Transform must be an object',
        suggestion: 'Provide transform with position, scale, rotation, skew, and alpha',
        code: 'INVALID_TRANSFORM_TYPE'
      });
      return;
    }

    const requiredProps = ['position', 'scale', 'rotation', 'skew', 'alpha'];
    for (const prop of requiredProps) {
      if (!(prop in transform)) {
        errors.push({
          path: `${path}.${prop}`,
          message: `Missing required transform property: ${prop}`,
          suggestion: `Add "${prop}" to your transform`,
          code: 'MISSING_TRANSFORM_PROPERTY'
        });
      }
    }

    // Validate Vector2 properties
    ['position', 'scale', 'skew'].forEach(prop => {
      if (transform[prop]) {
        this.validateVector2(transform[prop], `${path}.${prop}`, errors);
      }
    });

    // Validate numeric properties
    if (transform.rotation !== undefined && typeof transform.rotation !== 'number') {
      errors.push({
        path: `${path}.rotation`,
        message: 'Transform rotation must be a number',
        suggestion: 'Provide rotation as a numeric value in radians',
        code: 'INVALID_ROTATION_TYPE'
      });
    }

    if (transform.alpha !== undefined) {
      if (typeof transform.alpha !== 'number' || transform.alpha < 0 || transform.alpha > 1) {
        errors.push({
          path: `${path}.alpha`,
          message: 'Transform alpha must be a number between 0 and 1',
          suggestion: 'Provide alpha as a numeric value between 0 (transparent) and 1 (opaque)',
          code: 'INVALID_ALPHA_VALUE'
        });
      }
    }
  }

  private validateVector2(vector: any, path: string, errors: ValidationError[]): void {
    // Support both array format [x, y] and object format {x, y}
    if (Array.isArray(vector)) {
      if (vector.length !== 2) {
        errors.push({
          path,
          message: 'Vector2 array must have exactly 2 elements',
          suggestion: 'Provide vector as [x, y] with two numeric values',
          code: 'INVALID_VECTOR2_ARRAY_LENGTH'
        });
        return;
      }
      
      vector.forEach((value, index) => {
        if (typeof value !== 'number') {
          errors.push({
            path: `${path}[${index}]`,
            message: `Vector2 array element must be a number`,
            suggestion: `Provide numeric value at index ${index}`,
            code: 'INVALID_VECTOR2_ARRAY_VALUE'
          });
        }
      });
      return;
    }

    if (typeof vector !== 'object' || vector === null) {
      errors.push({
        path,
        message: 'Vector2 must be an array [x, y] or object {x, y}',
        suggestion: 'Provide vector as [x, y] array or {x, y} object with numeric values',
        code: 'INVALID_VECTOR2_TYPE'
      });
      return;
    }

    ['x', 'y'].forEach(prop => {
      if (!(prop in vector)) {
        errors.push({
          path: `${path}.${prop}`,
          message: `Missing required vector property: ${prop}`,
          suggestion: `Add "${prop}" numeric value to your vector`,
          code: 'MISSING_VECTOR_PROPERTY'
        });
      } else if (typeof vector[prop] !== 'number') {
        errors.push({
          path: `${path}.${prop}`,
          message: `Vector ${prop} must be a number`,
          suggestion: `Provide ${prop} as a numeric value`,
          code: 'INVALID_VECTOR_VALUE'
        });
      }
    });
  }

  private validateAction(action: any, path: string, errors: ValidationError[]): void {
    if (typeof action !== 'object' || action === null) {
      errors.push({
        path,
        message: 'Action must be an object',
        suggestion: 'Provide action with type and params',
        code: 'INVALID_ACTION_TYPE'
      });
      return;
    }

    const validActionTypes = [
      'gotoScene', 'spawn', 'despawn', 'setVar', 'incVar', 'randomInt',
      'if', 'tween', 'playSprite', 'setCamera', 'shake', 'playSfx',
      'playMusic', 'startTimer', 'stopTimer', 'emit', 'moveCamera'
    ];

    if (!action.type) {
      errors.push({
        path: `${path}.type`,
        message: 'Action must have a type',
        suggestion: `Use one of: ${validActionTypes.join(', ')}`,
        code: 'MISSING_ACTION_TYPE'
      });
    } else if (!validActionTypes.includes(action.type)) {
      errors.push({
        path: `${path}.type`,
        message: `Invalid action type: ${action.type}`,
        suggestion: `Use one of: ${validActionTypes.join(', ')}`,
        code: 'INVALID_ACTION_TYPE_VALUE'
      });
    }

    if (!action.params || typeof action.params !== 'object') {
      errors.push({
        path: `${path}.params`,
        message: 'Action must have params object',
        suggestion: 'Provide params object with action-specific parameters',
        code: 'MISSING_ACTION_PARAMS'
      });
    }
  }

  private validateTrigger(trigger: any, path: string, errors: ValidationError[]): void {
    if (typeof trigger !== 'object' || trigger === null) {
      errors.push({
        path,
        message: 'Trigger must be an object',
        suggestion: 'Provide trigger with event and actions',
        code: 'INVALID_TRIGGER_TYPE'
      });
      return;
    }

    const validTriggerEvents = [
      'on.start', 'on.tick', 'on.key', 'on.pointer', 
      'on.timer', 'on.raycastHit'
    ];

    if (!trigger.event) {
      errors.push({
        path: `${path}.event`,
        message: 'Trigger must have an event',
        suggestion: `Use one of: ${validTriggerEvents.join(', ')}`,
        code: 'MISSING_TRIGGER_EVENT'
      });
    } else if (!validTriggerEvents.includes(trigger.event)) {
      errors.push({
        path: `${path}.event`,
        message: `Invalid trigger event: ${trigger.event}`,
        suggestion: `Use one of: ${validTriggerEvents.join(', ')}`,
        code: 'INVALID_TRIGGER_EVENT'
      });
    }

    if (!trigger.actions || !Array.isArray(trigger.actions)) {
      errors.push({
        path: `${path}.actions`,
        message: 'Trigger must have actions array',
        suggestion: 'Provide array of actions to execute when trigger fires',
        code: 'MISSING_TRIGGER_ACTIONS'
      });
    } else {
      trigger.actions.forEach((action: any, index: number) => {
        this.validateAction(action, `${path}.actions[${index}]`, errors);
      });
    }
  }

  private validateAssets(assets: any, errors: ValidationError[]): void {
    if (typeof assets !== 'object' || assets === null) {
      errors.push({
        path: 'assets',
        message: 'Assets must be an object',
        suggestion: 'Provide assets with sprites, audio, and fonts arrays',
        code: 'INVALID_ASSETS_TYPE'
      });
      return;
    }

    ['sprites', 'audio', 'fonts'].forEach(assetType => {
      if (!(assetType in assets)) {
        errors.push({
          path: `assets.${assetType}`,
          message: `Missing required asset type: ${assetType}`,
          suggestion: `Add "${assetType}" array to your assets`,
          code: 'MISSING_ASSET_TYPE'
        });
      } else if (!Array.isArray(assets[assetType])) {
        errors.push({
          path: `assets.${assetType}`,
          message: `Assets ${assetType} must be an array`,
          suggestion: `Provide ${assetType} as an array of asset objects`,
          code: 'INVALID_ASSET_TYPE_FORMAT'
        });
      }
    });
  }

  private validateVariables(variables: any, errors: ValidationError[]): void {
    if (typeof variables !== 'object' || variables === null) {
      errors.push({
        path: 'variables',
        message: 'Variables must be an object',
        suggestion: 'Provide variables as an object with string keys and number/string/boolean values',
        code: 'INVALID_VARIABLES_TYPE'
      });
      return;
    }

    for (const [key, value] of Object.entries(variables)) {
      const validTypes = ['number', 'string', 'boolean'];
      if (!validTypes.includes(typeof value)) {
        errors.push({
          path: `variables.${key}`,
          message: `Variable ${key} has invalid type: ${typeof value}`,
          suggestion: 'Variables must be numbers, strings, or booleans',
          code: 'INVALID_VARIABLE_TYPE'
        });
      }
    }
  }

  private validateSemantics(cartridge: LGFCartridge, warnings: ValidationWarning[]): void {
    // Check for common issues that don't break validation but might cause problems

    // Check for empty scenes
    cartridge.scenes.forEach((scene, index) => {
      if (!scene.root.children || scene.root.children.length === 0) {
        warnings.push({
          path: `scenes[${index}]`,
          message: `Scene "${scene.id}" has no child nodes`,
          suggestion: 'Consider adding some content to make the scene interactive'
        });
      }
    });

    // TODO: Check for unused assets in future implementation
    // This would require analyzing node properties to find asset references

    // Check for performance concerns
    const totalSprites = cartridge.assets.sprites.length;
    if (totalSprites > 100) {
      warnings.push({
        path: 'assets.sprites',
        message: `Large number of sprites (${totalSprites})`,
        suggestion: 'Consider optimizing sprite usage for better performance'
      });
    }
  }

  private isValidColor(color: string): boolean {
    return typeof color === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
  }
}

/**
 * Convenience function to validate a cartridge
 */
export function validateCartridge(cartridge: any): ValidationResult {
  const validator = new LGFValidator();
  return validator.validate(cartridge);
}