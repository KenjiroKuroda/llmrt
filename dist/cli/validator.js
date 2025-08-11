import { stat, readdir, readFile } from 'fs/promises';
import { resolve, join, extname, relative } from 'path';

/**
 * LGF Cartridge Validation System
 * Provides schema validation with actionable error messages
 */
/**
 * Simple JSON Schema validator implementation
 * Focused on LGF schema validation with actionable error messages
 */
class LGFValidator {
    constructor() {
        // Custom validator implementation - doesn't need schema object
    }
    /**
     * Validate a cartridge against the LGF schema
     */
    validate(cartridge) {
        const errors = [];
        const warnings = [];
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
        }
        catch (error) {
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
    validateStructure(obj, path, errors) {
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
    validateMetadata(metadata, errors) {
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
            }
            else if (typeof metadata[field] !== 'string' || metadata[field].length === 0) {
                errors.push({
                    path: `metadata.${field}`,
                    message: `Metadata ${field} must be a non-empty string`,
                    suggestion: `Provide a valid ${field} string`,
                    code: 'INVALID_METADATA_VALUE'
                });
            }
        }
    }
    validateTheme(theme, errors) {
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
        }
        else {
            const requiredColors = ['primary', 'secondary', 'background', 'text', 'accent'];
            for (const color of requiredColors) {
                if (!(color in theme.colors)) {
                    errors.push({
                        path: `theme.colors.${color}`,
                        message: `Missing required color: ${color}`,
                        suggestion: `Add "${color}" color to your theme`,
                        code: 'MISSING_THEME_COLOR'
                    });
                }
                else if (!this.isValidColor(theme.colors[color])) {
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
    validateScenes(scenes, errors) {
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
        const sceneIds = new Set();
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
            }
            else {
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
            }
            else {
                this.validateNode(scene.root, `scenes[${index}].root`, errors);
            }
        });
    }
    validateNode(node, path, errors) {
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
            node.children.forEach((child, index) => {
                this.validateNode(child, `${path}.children[${index}]`, errors);
            });
        }
        // Validate actions
        if (node.actions && Array.isArray(node.actions)) {
            node.actions.forEach((action, index) => {
                this.validateAction(action, `${path}.actions[${index}]`, errors);
            });
        }
        // Validate triggers
        if (node.triggers && Array.isArray(node.triggers)) {
            node.triggers.forEach((trigger, index) => {
                this.validateTrigger(trigger, `${path}.triggers[${index}]`, errors);
            });
        }
    }
    validateTransform(transform, path, errors) {
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
    validateVector2(vector, path, errors) {
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
            }
            else if (typeof vector[prop] !== 'number') {
                errors.push({
                    path: `${path}.${prop}`,
                    message: `Vector ${prop} must be a number`,
                    suggestion: `Provide ${prop} as a numeric value`,
                    code: 'INVALID_VECTOR_VALUE'
                });
            }
        });
    }
    validateAction(action, path, errors) {
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
        }
        else if (!validActionTypes.includes(action.type)) {
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
    validateTrigger(trigger, path, errors) {
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
        }
        else if (!validTriggerEvents.includes(trigger.event)) {
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
        }
        else {
            trigger.actions.forEach((action, index) => {
                this.validateAction(action, `${path}.actions[${index}]`, errors);
            });
        }
    }
    validateAssets(assets, errors) {
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
            }
            else if (!Array.isArray(assets[assetType])) {
                errors.push({
                    path: `assets.${assetType}`,
                    message: `Assets ${assetType} must be an array`,
                    suggestion: `Provide ${assetType} as an array of asset objects`,
                    code: 'INVALID_ASSET_TYPE_FORMAT'
                });
            }
        });
    }
    validateVariables(variables, errors) {
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
    validateSemantics(cartridge, warnings) {
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
    isValidColor(color) {
        return typeof color === 'string' && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
    }
}
/**
 * Convenience function to validate a cartridge
 */
function validateCartridge(cartridge) {
    const validator = new LGFValidator();
    return validator.validate(cartridge);
}

/**
 * LGF Cartridge Validator CLI Tool
 * Command-line interface for validating LGF cartridge files
 */
class LGFValidatorCLI {
    constructor(options) {
        this.options = options;
        this.stats = {
            totalFiles: 0,
            validFiles: 0,
            invalidFiles: 0,
            totalErrors: 0,
            totalWarnings: 0,
            processingTime: 0
        };
    }
    async run() {
        const startTime = Date.now();
        try {
            const files = await this.collectFiles();
            if (files.length === 0) {
                this.error('No LGF files found to validate');
                return 1;
            }
            const results = await this.validateFiles(files);
            this.stats.processingTime = Date.now() - startTime;
            if (this.options.json) {
                this.outputJSON(results);
            }
            else {
                this.outputResults(results);
            }
            return this.stats.invalidFiles > 0 && this.options.exitCode ? 1 : 0;
        }
        catch (error) {
            this.error(`CLI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return 1;
        }
    }
    async collectFiles() {
        const allFiles = [];
        for (const input of this.options.files) {
            try {
                const inputPath = resolve(input);
                const stats = await stat(inputPath);
                if (stats.isFile()) {
                    if (this.isLGFFile(inputPath)) {
                        allFiles.push(inputPath);
                    }
                }
                else if (stats.isDirectory()) {
                    const dirFiles = await this.collectFromDirectory(inputPath);
                    allFiles.push(...dirFiles);
                }
            }
            catch (error) {
                this.warn(`Cannot access ${input}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return [...new Set(allFiles)]; // Remove duplicates
    }
    async collectFromDirectory(dirPath) {
        const files = [];
        try {
            const entries = await readdir(dirPath);
            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                // Skip excluded patterns
                if (this.options.exclude?.some(pattern => this.matchesPattern(entry, pattern))) {
                    continue;
                }
                try {
                    const stats = await stat(fullPath);
                    if (stats.isFile() && this.isLGFFile(fullPath)) {
                        // Check if file matches pattern
                        if (!this.options.pattern || this.matchesPattern(entry, this.options.pattern)) {
                            files.push(fullPath);
                        }
                    }
                    else if (stats.isDirectory() && this.options.recursive) {
                        const subFiles = await this.collectFromDirectory(fullPath);
                        files.push(...subFiles);
                    }
                }
                catch (error) {
                    this.warn(`Cannot access ${fullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
        catch (error) {
            this.warn(`Cannot read directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return files;
    }
    isLGFFile(filePath) {
        const ext = extname(filePath).toLowerCase();
        return ext === '.json' && (filePath.includes('.lgf.') ||
            filePath.endsWith('.lgf') ||
            filePath.includes('cartridge'));
    }
    matchesPattern(filename, pattern) {
        // Simple glob-like pattern matching
        const regex = new RegExp(pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.'));
        return regex.test(filename);
    }
    async validateFiles(files) {
        const results = [];
        for (const file of files) {
            if (this.options.verbose && !this.options.quiet) {
                this.log(`Validating ${relative(process.cwd(), file)}...`);
            }
            const result = await this.validateFile(file);
            results.push(result);
            this.stats.totalFiles++;
            if (result.result.valid) {
                this.stats.validFiles++;
            }
            else {
                this.stats.invalidFiles++;
            }
            this.stats.totalErrors += result.result.errors.length;
            this.stats.totalWarnings += result.result.warnings.length;
        }
        return results;
    }
    async validateFile(filePath) {
        try {
            const content = await readFile(filePath, 'utf-8');
            const lineNumbers = this.buildLineNumberMap(content);
            let cartridge;
            try {
                cartridge = JSON.parse(content);
            }
            catch (parseError) {
                return {
                    file: filePath,
                    result: {
                        valid: false,
                        errors: [{
                                path: '',
                                message: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
                                code: 'JSON_PARSE_ERROR'
                            }],
                        warnings: []
                    },
                    parseError: parseError instanceof Error ? parseError.message : 'Invalid JSON',
                    lineNumbers
                };
            }
            const result = validateCartridge(cartridge);
            return {
                file: filePath,
                result,
                lineNumbers
            };
        }
        catch (error) {
            return {
                file: filePath,
                result: {
                    valid: false,
                    errors: [{
                            path: '',
                            message: `File read error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            code: 'FILE_READ_ERROR'
                        }],
                    warnings: []
                }
            };
        }
    }
    buildLineNumberMap(content) {
        content.split('\n');
        const lineMap = new Map();
        // Build a map of JSON paths to line numbers
        // This is a simplified implementation - a full implementation would need
        // a proper JSON parser that tracks positions
        let currentLine = 1;
        let currentPath = [];
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === '\n') {
                currentLine++;
                continue;
            }
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }
            // Look for property names
            if (char === '"') {
                const propertyMatch = content.slice(i).match(/^"([^"]+)"\s*:/);
                if (propertyMatch) {
                    const propertyName = propertyMatch[1];
                    const path = currentPath.length > 0 ? currentPath.join('.') + '.' + propertyName : propertyName;
                    lineMap.set(path, currentLine);
                }
            }
        }
        return lineMap;
    }
    outputResults(results) {
        if (!this.options.quiet) {
            this.outputSummary();
            console.log('');
        }
        for (const result of results) {
            if (!result.result.valid || result.result.warnings.length > 0 || this.options.verbose) {
                this.outputFileResult(result);
            }
        }
        if (!this.options.quiet) {
            this.outputStatistics();
        }
    }
    outputFileResult(result) {
        const relativePath = relative(process.cwd(), result.file);
        if (result.result.valid) {
            if (result.result.warnings.length > 0) {
                console.log(`\n${this.colorize('yellow', '⚠')} ${relativePath}`);
                this.outputWarnings(result.result.warnings, result.lineNumbers);
            }
            else if (this.options.verbose) {
                console.log(`\n${this.colorize('green', '✓')} ${relativePath}`);
            }
        }
        else {
            console.log(`\n${this.colorize('red', '✗')} ${relativePath}`);
            if (result.parseError) {
                console.log(`  ${this.colorize('red', 'Parse Error:')} ${result.parseError}`);
            }
            else {
                this.outputErrors(result.result.errors, result.lineNumbers);
            }
            if (result.result.warnings.length > 0) {
                this.outputWarnings(result.result.warnings, result.lineNumbers);
            }
        }
    }
    outputErrors(errors, lineNumbers) {
        for (const error of errors) {
            const lineInfo = lineNumbers?.get(error.path) ? `:${lineNumbers.get(error.path)}` : '';
            console.log(`  ${this.colorize('red', 'Error')} ${error.path}${lineInfo}: ${error.message}`);
            if (error.suggestion && this.options.verbose) {
                console.log(`    ${this.colorize('cyan', 'Suggestion:')} ${error.suggestion}`);
            }
        }
    }
    outputWarnings(warnings, lineNumbers) {
        for (const warning of warnings) {
            const lineInfo = lineNumbers?.get(warning.path) ? `:${lineNumbers.get(warning.path)}` : '';
            console.log(`  ${this.colorize('yellow', 'Warning')} ${warning.path}${lineInfo}: ${warning.message}`);
            if (warning.suggestion && this.options.verbose) {
                console.log(`    ${this.colorize('cyan', 'Suggestion:')} ${warning.suggestion}`);
            }
        }
    }
    outputSummary() {
        const validCount = this.colorize('green', this.stats.validFiles.toString());
        const invalidCount = this.colorize('red', this.stats.invalidFiles.toString());
        const totalCount = this.stats.totalFiles.toString();
        console.log(`LGF Validator - ${validCount} valid, ${invalidCount} invalid, ${totalCount} total`);
    }
    outputStatistics() {
        console.log('\n' + this.colorize('cyan', 'Statistics:'));
        console.log(`  Files processed: ${this.stats.totalFiles}`);
        console.log(`  Valid files: ${this.colorize('green', this.stats.validFiles.toString())}`);
        console.log(`  Invalid files: ${this.colorize('red', this.stats.invalidFiles.toString())}`);
        console.log(`  Total errors: ${this.colorize('red', this.stats.totalErrors.toString())}`);
        console.log(`  Total warnings: ${this.colorize('yellow', this.stats.totalWarnings.toString())}`);
        console.log(`  Processing time: ${this.stats.processingTime}ms`);
        if (this.stats.totalFiles > 0) {
            const successRate = ((this.stats.validFiles / this.stats.totalFiles) * 100).toFixed(1);
            console.log(`  Success rate: ${successRate}%`);
        }
    }
    outputJSON(results) {
        const output = {
            summary: {
                totalFiles: this.stats.totalFiles,
                validFiles: this.stats.validFiles,
                invalidFiles: this.stats.invalidFiles,
                totalErrors: this.stats.totalErrors,
                totalWarnings: this.stats.totalWarnings,
                processingTime: this.stats.processingTime,
                successRate: this.stats.totalFiles > 0 ? (this.stats.validFiles / this.stats.totalFiles) * 100 : 0
            },
            files: results.map(result => ({
                file: relative(process.cwd(), result.file),
                valid: result.result.valid,
                errors: result.result.errors,
                warnings: result.result.warnings,
                parseError: result.parseError
            }))
        };
        console.log(JSON.stringify(output, null, 2));
    }
    colorize(color, text) {
        if (process.env.NO_COLOR || !process.stdout.isTTY) {
            return text;
        }
        const colors = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m',
            reset: '\x1b[0m'
        };
        return `${colors[color] || ''}${text}${colors.reset}`;
    }
    log(message) {
        if (!this.options.quiet) {
            console.log(message);
        }
    }
    warn(message) {
        if (!this.options.quiet) {
            console.warn(`${this.colorize('yellow', 'Warning:')} ${message}`);
        }
    }
    error(message) {
        console.error(`${this.colorize('red', 'Error:')} ${message}`);
    }
}
// CLI argument parsing
function parseArgs(args) {
    const options = {
        files: [],
        recursive: false,
        verbose: false,
        json: false,
        quiet: false,
        exitCode: true,
        exclude: []
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '-r':
            case '--recursive':
                options.recursive = true;
                break;
            case '-v':
            case '--verbose':
                options.verbose = true;
                break;
            case '-j':
            case '--json':
                options.json = true;
                break;
            case '-q':
            case '--quiet':
                options.quiet = true;
                break;
            case '--no-exit-code':
                options.exitCode = false;
                break;
            case '-p':
            case '--pattern':
                if (i + 1 < args.length) {
                    options.pattern = args[++i];
                }
                else {
                    throw new Error('--pattern requires a value');
                }
                break;
            case '-e':
            case '--exclude':
                if (i + 1 < args.length) {
                    options.exclude = options.exclude || [];
                    options.exclude.push(args[++i]);
                }
                else {
                    throw new Error('--exclude requires a value');
                }
                break;
            case '-h':
            case '--help':
                showHelp();
                process.exit(0);
                break;
            case '--version':
                console.log('1.0.0');
                process.exit(0);
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown option: ${arg}`);
                }
                options.files.push(arg);
                break;
        }
    }
    if (options.files.length === 0) {
        options.files.push('.'); // Default to current directory
    }
    return options;
}
function showHelp() {
    console.log(`
LGF Cartridge Validator

Usage: lgf-validate [options] [files...]

Options:
  -r, --recursive       Recursively search directories for LGF files
  -v, --verbose         Show detailed output including successful validations
  -j, --json           Output results in JSON format
  -q, --quiet          Suppress non-error output
  -p, --pattern <glob>  Only validate files matching the pattern
  -e, --exclude <glob>  Exclude files matching the pattern (can be used multiple times)
  --no-exit-code       Don't exit with error code on validation failures
  -h, --help           Show this help message
  --version            Show version number

Examples:
  lgf-validate game.lgf.json                    # Validate single file
  lgf-validate games/                           # Validate all LGF files in directory
  lgf-validate -r src/                          # Recursively validate all LGF files
  lgf-validate -p "*.lgf.json" -r .            # Validate files matching pattern
  lgf-validate -e "test*" -r .                 # Exclude test files
  lgf-validate -j games/ > validation.json     # Output JSON report
  lgf-validate -v -r .                         # Verbose output with all results

Exit Codes:
  0  All files are valid
  1  One or more files are invalid or CLI error occurred
`);
}
// Main execution
async function main() {
    try {
        const options = parseArgs(process.argv.slice(2));
        const cli = new LGFValidatorCLI(options);
        const exitCode = await cli.run();
        process.exit(exitCode);
    }
    catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
}
// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

export { LGFValidatorCLI };
