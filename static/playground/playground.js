/**
 * Module registration system for tree-shakeable architecture
 */
class ModuleRegistry {
    constructor() {
        this.modules = new Map();
        this.renderModules = new Map();
        this.actionHandlers = new Map();
        this.triggerEvents = new Set();
    }
    static getInstance() {
        if (!ModuleRegistry.instance) {
            ModuleRegistry.instance = new ModuleRegistry();
        }
        return ModuleRegistry.instance;
    }
    registerModule(module) {
        this.modules.set(module.name, module);
        // Register node types
        module.nodeTypes.forEach(_nodeType => {
            // Node type registration will be handled by the scene tree system
        });
        // Register actions
        module.actions.forEach(_action => {
            // Action registration will be handled by the action system
        });
        // Register triggers
        module.triggers.forEach(trigger => {
            this.triggerEvents.add(trigger);
        });
    }
    registerRenderModule(renderModule) {
        this.renderModules.set(renderModule.name, renderModule);
    }
    registerActionHandler(actionType, handler) {
        this.actionHandlers.set(actionType, handler);
    }
    getModule(name) {
        return this.modules.get(name);
    }
    getRenderModule(name) {
        return this.renderModules.get(name);
    }
    getRenderModulesForNodeType(nodeType) {
        return Array.from(this.renderModules.values())
            .filter(module => module.nodeTypes.includes(nodeType));
    }
    getActionHandler(actionType) {
        return this.actionHandlers.get(actionType);
    }
    isRegisteredModule(name) {
        return this.modules.has(name);
    }
    getRegisteredModules() {
        return Array.from(this.modules.values());
    }
    getRenderModules() {
        return Array.from(this.renderModules.values());
    }
    getEstimatedSize() {
        return Array.from(this.modules.values())
            .reduce((total, module) => total + module.size, 0);
    }
    supportsNodeType(nodeType) {
        // Core node types are always supported
        const coreNodeTypes = ['Group', 'Sprite', 'Text', 'Button', 'Camera2D', 'Particles2D', 'PostChain'];
        if (coreNodeTypes.includes(nodeType)) {
            return true;
        }
        // Check if any registered module supports this node type
        return Array.from(this.modules.values())
            .some(module => module.nodeTypes.includes(nodeType));
    }
    supportsTriggerEvent(event) {
        // Core trigger events are always supported
        const coreTriggerEvents = ['on.start', 'on.tick', 'on.key', 'on.pointer', 'on.timer'];
        if (coreTriggerEvents.includes(event)) {
            return true;
        }
        // Check if any registered module supports this trigger event
        return this.triggerEvents.has(event);
    }
}

/**
 * Input management system for the LLM Canvas Engine
 * Handles keyboard and pointer input with action mapping and state tracking
 */
class InputManagerImpl {
    constructor() {
        this.keyMappings = new Map();
        this.pointerMappings = new Map();
        this.actionStates = new Map();
        this.keyStates = new Map();
        this.canvas = null;
        this.frameCount = 0;
        this.isInitialized = false;
        this.pointerState = {
            position: { x: 0, y: 0 },
            worldPosition: { x: 0, y: 0 },
            buttons: new Map()
        };
        // Bind event handlers for cleanup
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundContextMenu = this.handleContextMenu.bind(this);
    }
    initialize(canvas) {
        if (this.isInitialized) {
            this.cleanup();
        }
        this.canvas = canvas;
        this.isInitialized = true;
        // Add keyboard event listeners to document
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);
        // Add pointer event listeners to canvas
        canvas.addEventListener('pointerdown', this.boundPointerDown);
        canvas.addEventListener('pointerup', this.boundPointerUp);
        canvas.addEventListener('pointermove', this.boundPointerMove);
        canvas.addEventListener('contextmenu', this.boundContextMenu);
        // Make canvas focusable for keyboard events
        canvas.tabIndex = 0;
        canvas.style.outline = 'none';
    }
    cleanup() {
        if (!this.isInitialized)
            return;
        // Remove event listeners
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
            this.canvas.removeEventListener('pointerup', this.boundPointerUp);
            this.canvas.removeEventListener('pointermove', this.boundPointerMove);
            this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
        }
        this.canvas = null;
        this.isInitialized = false;
    }
    mapKey(key, action) {
        // Sanitize key input
        const sanitizedKey = this.sanitizeKey(key);
        const sanitizedAction = this.sanitizeAction(action);
        if (sanitizedKey && sanitizedAction) {
            this.keyMappings.set(sanitizedKey, sanitizedAction);
        }
    }
    mapPointer(button, action) {
        // Sanitize inputs
        if (button < 0 || button > 4)
            return; // Only support standard mouse buttons
        const sanitizedAction = this.sanitizeAction(action);
        if (sanitizedAction) {
            this.pointerMappings.set(button, sanitizedAction);
        }
    }
    isActionPressed(action) {
        const state = this.actionStates.get(action);
        return state ? state.pressed : false;
    }
    isActionJustPressed(action) {
        const state = this.actionStates.get(action);
        return state ? state.justPressed : false;
    }
    isActionJustReleased(action) {
        const state = this.actionStates.get(action);
        return state ? state.justReleased : false;
    }
    getPointerPosition() {
        return { ...this.pointerState.position };
    }
    getPointerWorldPosition(camera) {
        // For now, return screen position. Camera transformation would be added later
        return { ...this.pointerState.position };
    }
    update() {
        this.frameCount++;
        // Update action states based on key and pointer states
        this.updateActionStates();
        // Clear just-pressed and just-released flags after one frame
        this.clearFrameFlags();
    }
    handleKeyDown(event) {
        const key = this.normalizeKey(event.code);
        if (!key)
            return;
        // Prevent default for mapped keys to avoid browser shortcuts
        const action = this.keyMappings.get(key);
        if (action) {
            event.preventDefault();
        }
        this.updateKeyState(key, true);
    }
    handleKeyUp(event) {
        const key = this.normalizeKey(event.code);
        if (!key)
            return;
        this.updateKeyState(key, false);
    }
    handlePointerDown(event) {
        if (!this.canvas)
            return;
        event.preventDefault();
        this.canvas.focus(); // Ensure canvas has focus for keyboard events
        this.updatePointerPosition(event);
        this.updatePointerButtonState(event.button, true);
    }
    handlePointerUp(event) {
        event.preventDefault();
        this.updatePointerPosition(event);
        this.updatePointerButtonState(event.button, false);
    }
    handlePointerMove(event) {
        this.updatePointerPosition(event);
    }
    handleContextMenu(event) {
        // Prevent context menu to avoid interfering with right-click actions
        event.preventDefault();
    }
    updatePointerPosition(event) {
        if (!this.canvas)
            return;
        const rect = this.canvas.getBoundingClientRect();
        this.pointerState.position = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    updateKeyState(key, pressed) {
        let state = this.keyStates.get(key);
        if (!state) {
            state = {
                pressed: false,
                justPressed: false,
                justReleased: false,
                framePressed: -1,
                frameReleased: -1
            };
            this.keyStates.set(key, state);
        }
        if (pressed && !state.pressed) {
            state.pressed = true;
            state.justPressed = true;
            state.framePressed = this.frameCount;
        }
        else if (!pressed && state.pressed) {
            state.pressed = false;
            state.justReleased = true;
            state.frameReleased = this.frameCount;
        }
    }
    updatePointerButtonState(button, pressed) {
        let state = this.pointerState.buttons.get(button);
        if (!state) {
            state = {
                pressed: false,
                justPressed: false,
                justReleased: false,
                framePressed: -1,
                frameReleased: -1
            };
            this.pointerState.buttons.set(button, state);
        }
        if (pressed && !state.pressed) {
            state.pressed = true;
            state.justPressed = true;
            state.framePressed = this.frameCount;
        }
        else if (!pressed && state.pressed) {
            state.pressed = false;
            state.justReleased = true;
            state.frameReleased = this.frameCount;
        }
    }
    updateActionStates() {
        // Update action states based on key mappings
        for (const [key, action] of this.keyMappings) {
            const keyState = this.keyStates.get(key);
            if (keyState) {
                this.updateActionState(action, keyState);
            }
        }
        // Update action states based on pointer mappings
        for (const [button, action] of this.pointerMappings) {
            const buttonState = this.pointerState.buttons.get(button);
            if (buttonState) {
                this.updateActionState(action, buttonState);
            }
        }
    }
    updateActionState(action, inputState) {
        let actionState = this.actionStates.get(action);
        if (!actionState) {
            actionState = {
                pressed: false,
                justPressed: false,
                justReleased: false,
                framePressed: -1,
                frameReleased: -1
            };
            this.actionStates.set(action, actionState);
        }
        // Action is pressed if any mapped input is pressed
        if (inputState.pressed) {
            if (!actionState.pressed) {
                actionState.pressed = true;
                actionState.justPressed = true;
                actionState.framePressed = this.frameCount;
            }
        }
        // Action is released when all mapped inputs are released
        if (!inputState.pressed && actionState.pressed) {
            // Check if any other inputs for this action are still pressed
            let anyPressed = false;
            for (const [key, mappedAction] of this.keyMappings) {
                if (mappedAction === action) {
                    const keyState = this.keyStates.get(key);
                    if (keyState && keyState.pressed) {
                        anyPressed = true;
                        break;
                    }
                }
            }
            if (!anyPressed) {
                for (const [button, mappedAction] of this.pointerMappings) {
                    if (mappedAction === action) {
                        const buttonState = this.pointerState.buttons.get(button);
                        if (buttonState && buttonState.pressed) {
                            anyPressed = true;
                            break;
                        }
                    }
                }
            }
            if (!anyPressed) {
                actionState.pressed = false;
                actionState.justReleased = true;
                actionState.frameReleased = this.frameCount;
            }
        }
    }
    clearFrameFlags() {
        // Clear just-pressed and just-released flags for keys
        for (const state of this.keyStates.values()) {
            if (state.justPressed && state.framePressed < this.frameCount) {
                state.justPressed = false;
            }
            if (state.justReleased && state.frameReleased < this.frameCount) {
                state.justReleased = false;
            }
        }
        // Clear just-pressed and just-released flags for pointer buttons
        for (const state of this.pointerState.buttons.values()) {
            if (state.justPressed && state.framePressed < this.frameCount) {
                state.justPressed = false;
            }
            if (state.justReleased && state.frameReleased < this.frameCount) {
                state.justReleased = false;
            }
        }
        // Clear just-pressed and just-released flags for actions
        for (const state of this.actionStates.values()) {
            if (state.justPressed && state.framePressed < this.frameCount) {
                state.justPressed = false;
            }
            if (state.justReleased && state.frameReleased < this.frameCount) {
                state.justReleased = false;
            }
        }
    }
    normalizeKey(code) {
        // Normalize key codes to consistent format
        // Remove common prefixes and convert to lowercase
        const normalized = code
            .replace(/^(Key|Digit|Numpad|Arrow)/, '')
            .toLowerCase();
        // Map some special cases for accessibility
        const keyMap = {
            'space': 'space',
            'enter': 'enter',
            'escape': 'escape',
            'tab': 'tab',
            'backspace': 'backspace',
            'delete': 'delete',
            'home': 'home',
            'end': 'end',
            'pageup': 'pageup',
            'pagedown': 'pagedown',
            'up': 'up',
            'down': 'down',
            'left': 'left',
            'right': 'right'
        };
        return keyMap[normalized] || normalized;
    }
    sanitizeKey(key) {
        // Only allow alphanumeric keys and common special keys
        const allowedPattern = /^[a-z0-9]$|^(space|enter|escape|tab|backspace|delete|home|end|pageup|pagedown|up|down|left|right|shift|ctrl|alt|meta)$/i;
        const normalized = key.toLowerCase().trim();
        return allowedPattern.test(normalized) ? normalized : null;
    }
    sanitizeAction(action) {
        // Only allow alphanumeric characters, underscores, and hyphens
        const allowedPattern = /^[a-zA-Z0-9_-]+$/;
        const trimmed = action.trim();
        return allowedPattern.test(trimmed) && trimmed.length <= 50 ? trimmed : null;
    }
}

/**
 * Lightweight audio system for the LLM Canvas Engine
 * Handles SFX and music playback with mobile audio unlock support
 */
class AudioManager {
    constructor() {
        this.assets = new Map();
        this.currentMusic = null;
        this.masterVolume = 1.0;
        this.unlocked = false;
        this.unlockPromise = null;
        // Bind methods to preserve context
        this.handleUserInteraction = this.handleUserInteraction.bind(this);
        // Set up auto-unlock on first user interaction
        this.setupAutoUnlock();
    }
    /**
     * Play a sound effect
     */
    playSfx(id, volume = 1.0) {
        const asset = this.assets.get(id);
        if (!asset || asset.type !== 'sfx') {
            console.warn(`SFX asset '${id}' not found`);
            return;
        }
        // Clone the audio element for overlapping playback
        const audio = asset.audio.cloneNode();
        audio.volume = Math.max(0, Math.min(1, volume * this.masterVolume));
        // Clean up after playback
        audio.addEventListener('ended', () => {
            audio.remove();
        });
        // Play if unlocked, otherwise queue for unlock
        if (this.unlocked) {
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(error => {
                    console.warn(`Failed to play SFX '${id}':`, error);
                });
            }
        }
        else {
            this.unlock().then(() => {
                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(error => {
                        console.warn(`Failed to play SFX '${id}':`, error);
                    });
                }
            });
        }
    }
    /**
     * Play background music
     */
    playMusic(id, loop = true, volume = 1.0) {
        const asset = this.assets.get(id);
        if (!asset || asset.type !== 'music') {
            console.warn(`Music asset '${id}' not found`);
            return;
        }
        // Stop current music if playing
        this.stopMusic();
        // Set up new music
        this.currentMusic = asset.audio.cloneNode();
        this.currentMusic.loop = loop;
        this.currentMusic.volume = Math.max(0, Math.min(1, volume * this.masterVolume));
        // Play if unlocked, otherwise queue for unlock
        if (this.unlocked) {
            const playPromise = this.currentMusic.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(error => {
                    console.warn(`Failed to play music '${id}':`, error);
                });
            }
        }
        else {
            this.unlock().then(() => {
                if (this.currentMusic) {
                    const playPromise = this.currentMusic.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(error => {
                            console.warn(`Failed to play music '${id}':`, error);
                        });
                    }
                }
            });
        }
    }
    /**
     * Stop currently playing music
     */
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
    /**
     * Set master volume for all audio
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        // Update current music volume
        if (this.currentMusic) {
            this.currentMusic.volume = this.currentMusic.volume * this.masterVolume;
        }
    }
    /**
     * Load audio assets and cache them
     */
    async loadAssets(assets) {
        const loadPromises = assets.map(asset => this.loadAsset(asset));
        await Promise.all(loadPromises);
    }
    /**
     * Clean up resources
     */
    cleanup() {
        this.stopMusic();
        this.assets.clear();
        this.removeAutoUnlock();
    }
    /**
     * Check if audio is unlocked (required for mobile)
     */
    isUnlocked() {
        return this.unlocked;
    }
    /**
     * Manually unlock audio (usually called on user interaction)
     */
    async unlock() {
        if (this.unlocked) {
            return;
        }
        if (this.unlockPromise) {
            return this.unlockPromise;
        }
        this.unlockPromise = this.performUnlock();
        return this.unlockPromise;
    }
    /**
     * Load a single audio asset
     */
    async loadAsset(asset) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.addEventListener('canplaythrough', () => {
                this.assets.set(asset.id, {
                    id: asset.id,
                    audio,
                    type: asset.type
                });
                resolve();
            });
            audio.addEventListener('error', (error) => {
                console.warn(`Failed to load audio asset '${asset.id}':`, error);
                reject(error);
            });
            // Set up audio element
            audio.preload = 'auto';
            audio.src = asset.url;
        });
    }
    /**
     * Set up automatic audio unlock on first user interaction
     */
    setupAutoUnlock() {
        // Listen for various user interaction events
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => {
            document.addEventListener(event, this.handleUserInteraction, { once: true, passive: true });
        });
    }
    /**
     * Remove auto-unlock event listeners
     */
    removeAutoUnlock() {
        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(event => {
            document.removeEventListener(event, this.handleUserInteraction);
        });
    }
    /**
     * Handle user interaction for audio unlock
     */
    handleUserInteraction() {
        this.unlock();
    }
    /**
     * Perform the actual audio unlock
     */
    async performUnlock() {
        try {
            // Create a silent audio element and try to play it
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
            silentAudio.volume = 0;
            await silentAudio.play();
            this.unlocked = true;
            this.removeAutoUnlock();
            console.log('Audio unlocked successfully');
        }
        catch (error) {
            console.warn('Failed to unlock audio:', error);
            // Still mark as unlocked to avoid repeated attempts
            this.unlocked = true;
        }
        finally {
            this.unlockPromise = null;
        }
    }
}

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
        if (typeof vector !== 'object' || vector === null) {
            errors.push({
                path,
                message: 'Vector2 must be an object',
                suggestion: 'Provide vector with x and y numeric properties',
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
 * Asset Management System
 * Handles loading, caching, and management of sprites, audio, and fonts
 */
class AssetManager {
    constructor() {
        this.sprites = new Map();
        this.fonts = new Map();
        this.loadingPromises = new Map();
        // Default/fallback assets
        this.defaultSprite = null;
        this.defaultFont = 'Arial, sans-serif';
        this.createDefaultAssets();
    }
    /**
     * Load all assets from a manifest
     */
    async loadAssets(manifest, options = {}) {
        const { onProgress, timeout = 10000, retryCount = 2 } = options;
        const allAssets = [
            ...manifest.sprites.map(asset => ({ ...asset, type: 'sprite' })),
            ...manifest.fonts.map(asset => ({ ...asset, type: 'font' }))
        ];
        const progress = {
            total: allAssets.length,
            loaded: 0,
            failed: 0,
            progress: 0
        };
        if (onProgress) {
            onProgress(progress);
        }
        const loadPromises = allAssets.map(async (asset) => {
            try {
                progress.currentAsset = asset.id;
                if (asset.type === 'sprite') {
                    await this.loadSpriteAsset(asset, timeout, retryCount);
                }
                else if (asset.type === 'font') {
                    await this.loadFontAsset(asset, timeout, retryCount);
                }
                progress.loaded++;
            }
            catch (error) {
                console.warn(`Failed to load asset '${asset.id}':`, error);
                progress.failed++;
            }
            progress.progress = (progress.loaded + progress.failed) / progress.total;
            if (onProgress) {
                onProgress(progress);
            }
        });
        await Promise.allSettled(loadPromises);
    }
    /**
     * Load a single sprite asset
     */
    async loadSpriteAsset(asset, timeout = 10000, retryCount = 2) {
        // Check if already loaded
        const existing = this.sprites.get(asset.id);
        if (existing) {
            return existing;
        }
        // Check if already loading
        const existingPromise = this.loadingPromises.get(`sprite:${asset.id}`);
        if (existingPromise) {
            return existingPromise;
        }
        const loadPromise = this.loadSpriteWithRetry(asset, timeout, retryCount);
        this.loadingPromises.set(`sprite:${asset.id}`, loadPromise);
        try {
            const loadedAsset = await loadPromise;
            this.sprites.set(asset.id, loadedAsset);
            return loadedAsset;
        }
        finally {
            this.loadingPromises.delete(`sprite:${asset.id}`);
        }
    }
    /**
     * Load a single font asset
     */
    async loadFontAsset(asset, timeout = 10000, retryCount = 2) {
        // Check if already loaded
        const existing = this.fonts.get(asset.id);
        if (existing) {
            return existing;
        }
        // Check if already loading
        const existingPromise = this.loadingPromises.get(`font:${asset.id}`);
        if (existingPromise) {
            return existingPromise;
        }
        const loadPromise = this.loadFontWithRetry(asset, timeout, retryCount);
        this.loadingPromises.set(`font:${asset.id}`, loadPromise);
        try {
            const loadedAsset = await loadPromise;
            this.fonts.set(asset.id, loadedAsset);
            return loadedAsset;
        }
        finally {
            this.loadingPromises.delete(`font:${asset.id}`);
        }
    }
    /**
     * Get a loaded sprite asset
     */
    getSprite(id) {
        return this.sprites.get(id) || null;
    }
    /**
     * Get a loaded font asset
     */
    getFont(id) {
        return this.fonts.get(id) || null;
    }
    /**
     * Get sprite with fallback to default
     */
    getSpriteWithFallback(id) {
        const sprite = this.sprites.get(id);
        if (sprite) {
            return sprite.image;
        }
        console.warn(`Sprite '${id}' not found, using fallback`);
        return this.defaultSprite || this.createEmptyImage();
    }
    /**
     * Get font family with fallback to default
     */
    getFontWithFallback(id) {
        const font = this.fonts.get(id);
        if (font && font.loaded) {
            return font.family;
        }
        console.warn(`Font '${id}' not found or not loaded, using fallback`);
        return this.defaultFont;
    }
    /**
     * Clear all cached assets
     */
    clearCache() {
        this.sprites.clear();
        this.fonts.clear();
        this.loadingPromises.clear();
    }
    /**
     * Get memory usage statistics
     */
    getMemoryUsage() {
        let spriteMemory = 0;
        for (const sprite of this.sprites.values()) {
            // Estimate memory usage: width * height * 4 bytes per pixel
            spriteMemory += sprite.width * sprite.height * 4;
        }
        const fontMemory = this.fonts.size * 1024; // Rough estimate per font
        return {
            sprites: spriteMemory,
            fonts: fontMemory,
            total: spriteMemory + fontMemory
        };
    }
    /**
     * Check if an asset is loaded
     */
    isAssetLoaded(id, type) {
        if (type === 'sprite') {
            return this.sprites.has(id);
        }
        else if (type === 'font') {
            const font = this.fonts.get(id);
            return font ? font.loaded : false;
        }
        return false;
    }
    async loadSpriteWithRetry(asset, timeout, retryCount) {
        let lastError = null;
        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                return await this.loadSpriteImage(asset, timeout);
            }
            catch (error) {
                lastError = error;
                if (attempt < retryCount) {
                    // Wait before retry with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        throw lastError;
    }
    async loadFontWithRetry(asset, timeout, retryCount) {
        let lastError = null;
        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                return await this.loadFontFace(asset, timeout);
            }
            catch (error) {
                lastError = error;
                if (attempt < retryCount) {
                    // Wait before retry with exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        throw lastError;
    }
    async loadSpriteImage(asset, timeout) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let timeoutId = null;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                img.onload = null;
                img.onerror = null;
            };
            img.onload = () => {
                cleanup();
                resolve({
                    id: asset.id,
                    image: img,
                    width: asset.width,
                    height: asset.height,
                    frames: asset.frames || 1
                });
            };
            img.onerror = () => {
                cleanup();
                reject(new Error(`Failed to load sprite: ${asset.url}`));
            };
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Sprite load timeout: ${asset.url}`));
            }, timeout);
            // Set crossOrigin to handle CORS if needed
            img.crossOrigin = 'anonymous';
            img.src = asset.url;
        });
    }
    async loadFontFace(asset, timeout) {
        // Check if FontFace API is available
        if (typeof FontFace === 'undefined') {
            // Fallback for older browsers - just return the font family
            return {
                id: asset.id,
                family: asset.family,
                loaded: true
            };
        }
        return new Promise((resolve, reject) => {
            const fontFace = new FontFace(asset.family, `url(${asset.url})`);
            let timeoutId = null;
            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
            };
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Font load timeout: ${asset.url}`));
            }, timeout);
            fontFace.load().then(() => {
                cleanup();
                // Add font to document
                document.fonts.add(fontFace);
                resolve({
                    id: asset.id,
                    family: asset.family,
                    loaded: true
                });
            }).catch((error) => {
                cleanup();
                reject(new Error(`Failed to load font: ${asset.url} - ${error.message}`));
            });
        });
    }
    createDefaultAssets() {
        // Create a simple 1x1 transparent pixel as default sprite
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Magenta to indicate missing asset
                ctx.fillRect(0, 0, 1, 1);
            }
            this.defaultSprite = new Image();
            this.defaultSprite.src = canvas.toDataURL();
        }
        catch (error) {
            // Fallback for test environments without canvas support
            this.defaultSprite = new Image();
            this.defaultSprite.width = 1;
            this.defaultSprite.height = 1;
        }
    }
    createEmptyImage() {
        const img = new Image();
        img.width = 1;
        img.height = 1;
        return img;
    }
}

/**
 * Cartridge Loading System
 * Handles loading, parsing, and validation of LGF cartridges
 */
class CartridgeLoader {
    constructor(assetManager, audioManager) {
        this.assetManager = assetManager || new AssetManager();
        this.audioManager = audioManager || new AudioManager();
    }
    /**
     * Load a cartridge from JSON string
     */
    async loadFromJSON(jsonString, options = {}) {
        const { onProgress, validateOnly = false, skipAssets = false } = options;
        // Stage 1: Parse JSON
        if (onProgress) {
            onProgress({
                stage: 'parsing',
                progress: 0,
                message: 'Parsing cartridge JSON...'
            });
        }
        let cartridge;
        try {
            cartridge = JSON.parse(jsonString);
        }
        catch (error) {
            throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
        }
        if (onProgress) {
            onProgress({
                stage: 'parsing',
                progress: 1,
                message: 'JSON parsed successfully'
            });
        }
        // Stage 2: Validate cartridge
        if (onProgress) {
            onProgress({
                stage: 'validating',
                progress: 0,
                message: 'Validating cartridge format...'
            });
        }
        const validation = validateCartridge(cartridge);
        if (onProgress) {
            onProgress({
                stage: 'validating',
                progress: 1,
                message: validation.valid ? 'Validation successful' : `Validation failed with ${validation.errors.length} errors`
            });
        }
        if (!validation.valid) {
            throw new Error(`Cartridge validation failed:\n${validation.errors.map(e => `- ${e.path}: ${e.message}`).join('\n')}`);
        }
        if (validateOnly) {
            return {
                cartridge: cartridge,
                validation,
                assetManager: this.assetManager,
                audioManager: this.audioManager
            };
        }
        // Stage 3: Load assets
        if (!skipAssets && cartridge.assets) {
            if (onProgress) {
                onProgress({
                    stage: 'loading-assets',
                    progress: 0,
                    message: 'Loading assets...'
                });
            }
            await this.loadCartridgeAssets(cartridge, {
                onProgress: (assetProgress) => {
                    if (onProgress) {
                        onProgress({
                            stage: 'loading-assets',
                            progress: assetProgress.progress,
                            message: `Loading assets... (${assetProgress.loaded}/${assetProgress.total})`,
                            assetProgress
                        });
                    }
                },
                timeout: options.assetTimeout,
                retryCount: options.assetRetryCount
            });
        }
        return {
            cartridge: cartridge,
            validation,
            assetManager: this.assetManager,
            audioManager: this.audioManager
        };
    }
    /**
     * Load a cartridge from a URL
     */
    async loadFromURL(url, options = {}) {
        const { onProgress } = options;
        if (onProgress) {
            onProgress({
                stage: 'parsing',
                progress: 0,
                message: `Fetching cartridge from ${url}...`
            });
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const jsonString = await response.text();
            if (onProgress) {
                onProgress({
                    stage: 'parsing',
                    progress: 0.5,
                    message: 'Cartridge downloaded, parsing...'
                });
            }
            return await this.loadFromJSON(jsonString, options);
        }
        catch (error) {
            throw new Error(`Failed to load cartridge from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Load a cartridge from a File object (for file uploads)
     */
    async loadFromFile(file, options = {}) {
        const { onProgress } = options;
        if (onProgress) {
            onProgress({
                stage: 'parsing',
                progress: 0,
                message: `Reading file ${file.name}...`
            });
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jsonString = event.target?.result;
                    if (onProgress) {
                        onProgress({
                            stage: 'parsing',
                            progress: 0.5,
                            message: 'File read, parsing...'
                        });
                    }
                    const result = await this.loadFromJSON(jsonString, options);
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
            };
            reader.readAsText(file);
        });
    }
    /**
     * Validate a cartridge without loading assets
     */
    async validateCartridge(cartridge) {
        let parsedCartridge;
        if (typeof cartridge === 'string') {
            try {
                parsedCartridge = JSON.parse(cartridge);
            }
            catch (error) {
                return {
                    valid: false,
                    errors: [{
                            path: '',
                            message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}`,
                            code: 'JSON_PARSE_ERROR'
                        }],
                    warnings: []
                };
            }
        }
        else {
            parsedCartridge = cartridge;
        }
        return validateCartridge(parsedCartridge);
    }
    /**
     * Get asset manager instance
     */
    getAssetManager() {
        return this.assetManager;
    }
    /**
     * Get audio manager instance
     */
    getAudioManager() {
        return this.audioManager;
    }
    /**
     * Clear all cached assets
     */
    clearCache() {
        this.assetManager.clearCache();
        this.audioManager.cleanup();
    }
    /**
     * Get memory usage statistics
     */
    getMemoryUsage() {
        const assetMemory = this.assetManager.getMemoryUsage();
        const audioMemory = 0; // AudioManager doesn't expose memory usage yet
        return {
            assets: assetMemory,
            audio: audioMemory,
            total: assetMemory.total + audioMemory
        };
    }
    async loadCartridgeAssets(cartridge, options) {
        const promises = [];
        // Load sprite and font assets through AssetManager
        if (cartridge.assets.sprites.length > 0 || cartridge.assets.fonts.length > 0) {
            promises.push(this.assetManager.loadAssets({
                sprites: cartridge.assets.sprites,
                audio: [], // Audio handled separately
                fonts: cartridge.assets.fonts
            }, options).catch(error => {
                console.warn('Asset loading failed:', error);
                // Don't throw - allow cartridge to load with missing assets
            }));
        }
        // Load audio assets through AudioManager
        if (cartridge.assets.audio.length > 0) {
            promises.push(this.audioManager.loadAssets(cartridge.assets.audio).catch(error => {
                console.warn('Audio asset loading failed:', error);
                // Don't throw - allow cartridge to load with missing audio
            }));
        }
        await Promise.allSettled(promises);
    }
}

/**
 * Core LLMRTEngine implementation
 */
class LLMRTEngineImpl {
    constructor() {
        this.state = {
            running: false,
            paused: false,
            currentScene: null,
            tickCount: 0,
            frameRate: 0
        };
        this.cartridge = null;
        this.moduleRegistry = ModuleRegistry.getInstance();
        this.inputManager = new InputManagerImpl();
        this.audioManager = new AudioManager();
        this.assetManager = new AssetManager();
        this.cartridgeLoader = new CartridgeLoader(this.assetManager, this.audioManager);
    }
    async loadCartridge(cartridge, options) {
        // Use the cartridge loader for comprehensive loading
        const result = await this.cartridgeLoader.loadFromJSON(JSON.stringify(cartridge), options);
        // Validate that all node types are supported
        for (const scene of result.cartridge.scenes) {
            this.validateNodeTree(scene.root);
        }
        this.cartridge = result.cartridge;
        // Set initial scene if available
        if (result.cartridge.scenes.length > 0) {
            this.state.currentScene = result.cartridge.scenes[0].id;
        }
    }
    /**
     * Load cartridge from JSON string
     */
    async loadCartridgeFromJSON(jsonString, options) {
        const result = await this.cartridgeLoader.loadFromJSON(jsonString, options);
        // Validate that all node types are supported
        for (const scene of result.cartridge.scenes) {
            this.validateNodeTree(scene.root);
        }
        this.cartridge = result.cartridge;
        // Set initial scene if available
        if (result.cartridge.scenes.length > 0) {
            this.state.currentScene = result.cartridge.scenes[0].id;
        }
    }
    /**
     * Load cartridge from URL
     */
    async loadCartridgeFromURL(url, options) {
        const result = await this.cartridgeLoader.loadFromURL(url, options);
        // Validate that all node types are supported
        for (const scene of result.cartridge.scenes) {
            this.validateNodeTree(scene.root);
        }
        this.cartridge = result.cartridge;
        // Set initial scene if available
        if (result.cartridge.scenes.length > 0) {
            this.state.currentScene = result.cartridge.scenes[0].id;
        }
    }
    /**
     * Load cartridge from File object
     */
    async loadCartridgeFromFile(file, options) {
        const result = await this.cartridgeLoader.loadFromFile(file, options);
        // Validate that all node types are supported
        for (const scene of result.cartridge.scenes) {
            this.validateNodeTree(scene.root);
        }
        this.cartridge = result.cartridge;
        // Set initial scene if available
        if (result.cartridge.scenes.length > 0) {
            this.state.currentScene = result.cartridge.scenes[0].id;
        }
    }
    start() {
        if (!this.cartridge) {
            throw new Error('No cartridge loaded');
        }
        this.state.running = true;
        this.state.paused = false;
        this.state.tickCount = 0;
    }
    stop() {
        this.state.running = false;
        this.state.paused = false;
        this.state.tickCount = 0;
        this.audioManager.stopMusic();
    }
    pause() {
        if (this.state.running) {
            this.state.paused = true;
        }
    }
    resume() {
        if (this.state.running) {
            this.state.paused = false;
        }
    }
    getState() {
        return { ...this.state };
    }
    getInputManager() {
        return this.inputManager;
    }
    getAudioManager() {
        return this.audioManager;
    }
    /**
     * Get asset manager instance
     */
    getAssetManager() {
        return this.assetManager;
    }
    /**
     * Get cartridge loader instance
     */
    getCartridgeLoader() {
        return this.cartridgeLoader;
    }
    validateNodeTree(node) {
        if (!node.type || !this.moduleRegistry.supportsNodeType(node.type)) {
            throw new Error(`Unsupported node type: ${node.type}`);
        }
        // Validate triggers
        if (node.triggers && Array.isArray(node.triggers)) {
            for (const trigger of node.triggers) {
                if (!this.moduleRegistry.supportsTriggerEvent(trigger.event)) {
                    throw new Error(`Unsupported trigger event: ${trigger.event}`);
                }
            }
        }
        // Recursively validate children
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                this.validateNodeTree(child);
            }
        }
    }
}

/**
 * Main entry point for the LLM Canvas Engine
 */
// Factory function for creating engine instances
function createEngine() {
    return new LLMRTEngineImpl();
}

/**
 * Performance Profiler for LLM Canvas Engine
 * Provides detailed performance monitoring and analysis
 */
class PerformanceProfiler {
    constructor() {
        this.metrics = [];
        this.snapshots = [];
        this.alerts = [];
        this.isRecording = false;
        this.startTime = 0;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.thresholds = {
            frameTime: { warning: 20, critical: 33 }, // ms
            memory: { warning: 50, critical: 80 }, // MB
            fps: { warning: 45, critical: 30 }, // fps
            renderTime: { warning: 10, critical: 16 }, // ms
            drawCalls: { warning: 100, critical: 200 } // count
        };
        this.setupPerformanceObserver();
    }
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordMetric({
                            name: entry.name,
                            value: entry.duration,
                            unit: 'ms',
                            timestamp: entry.startTime,
                            category: this.categorizeEntry(entry.name)
                        });
                    });
                });
                observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
            }
            catch (error) {
                console.warn('PerformanceObserver not supported:', error);
            }
        }
    }
    categorizeEntry(name) {
        if (name.includes('frame') || name.includes('render'))
            return 'render';
        if (name.includes('audio'))
            return 'audio';
        if (name.includes('input'))
            return 'input';
        if (name.includes('memory'))
            return 'memory';
        return 'frame';
    }
    startRecording() {
        this.isRecording = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        this.metrics = [];
        this.snapshots = [];
        this.alerts = [];
        console.log('Performance profiling started');
    }
    stopRecording() {
        this.isRecording = false;
        const duration = performance.now() - this.startTime;
        console.log(`Performance profiling stopped. Duration: ${duration.toFixed(2)}ms`);
        return this.generateReport();
    }
    recordFrame(frameTime) {
        if (!this.isRecording)
            return;
        this.frameCount++;
        const now = performance.now();
        const fps = 1000 / frameTime;
        // Record frame metrics
        this.recordMetric({
            name: 'frameTime',
            value: frameTime,
            unit: 'ms',
            timestamp: now,
            category: 'frame'
        });
        this.recordMetric({
            name: 'fps',
            value: fps,
            unit: 'fps',
            timestamp: now,
            category: 'frame'
        });
        // Check for performance alerts
        this.checkThresholds('frameTime', frameTime);
        this.checkThresholds('fps', fps);
        this.lastFrameTime = now;
    }
    recordMemoryUsage() {
        if (!this.isRecording)
            return;
        const memory = this.getMemoryUsage();
        if (memory > 0) {
            this.recordMetric({
                name: 'memoryUsage',
                value: memory,
                unit: 'MB',
                timestamp: performance.now(),
                category: 'memory'
            });
            this.checkThresholds('memory', memory);
        }
    }
    recordRenderTime(renderTime) {
        if (!this.isRecording)
            return;
        this.recordMetric({
            name: 'renderTime',
            value: renderTime,
            unit: 'ms',
            timestamp: performance.now(),
            category: 'render'
        });
        this.checkThresholds('renderTime', renderTime);
    }
    recordDrawCalls(count) {
        if (!this.isRecording)
            return;
        this.recordMetric({
            name: 'drawCalls',
            value: count,
            unit: 'count',
            timestamp: performance.now(),
            category: 'render'
        });
        this.checkThresholds('drawCalls', count);
    }
    recordAudioLatency(latency) {
        if (!this.isRecording)
            return;
        this.recordMetric({
            name: 'audioLatency',
            value: latency,
            unit: 'ms',
            timestamp: performance.now(),
            category: 'audio'
        });
    }
    recordInputLatency(latency) {
        if (!this.isRecording)
            return;
        this.recordMetric({
            name: 'inputLatency',
            value: latency,
            unit: 'ms',
            timestamp: performance.now(),
            category: 'input'
        });
    }
    takeSnapshot() {
        const now = performance.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < 1000);
        const snapshot = {
            timestamp: now,
            frameTime: this.getAverageMetric(recentMetrics, 'frameTime'),
            fps: this.getAverageMetric(recentMetrics, 'fps'),
            memoryUsage: this.getLatestMetric(recentMetrics, 'memoryUsage'),
            renderTime: this.getAverageMetric(recentMetrics, 'renderTime'),
            updateTime: this.getAverageMetric(recentMetrics, 'updateTime'),
            audioLatency: this.getAverageMetric(recentMetrics, 'audioLatency'),
            inputLatency: this.getAverageMetric(recentMetrics, 'inputLatency'),
            activeNodes: this.getLatestMetric(recentMetrics, 'activeNodes'),
            drawCalls: this.getAverageMetric(recentMetrics, 'drawCalls')
        };
        if (this.isRecording) {
            this.snapshots.push(snapshot);
            // Keep only last 300 snapshots (5 minutes at 1 snapshot/second)
            if (this.snapshots.length > 300) {
                this.snapshots.shift();
            }
        }
        return snapshot;
    }
    recordMetric(metric) {
        this.metrics.push(metric);
        // Keep only last 1000 metrics to prevent memory issues
        if (this.metrics.length > 1000) {
            this.metrics.shift();
        }
    }
    checkThresholds(metricName, value) {
        const threshold = this.thresholds[metricName];
        if (!threshold)
            return;
        const now = performance.now();
        if (value >= threshold.critical) {
            this.alerts.push({
                type: 'critical',
                message: `Critical performance issue: ${metricName} is ${value}`,
                metric: metricName,
                value,
                threshold: threshold.critical,
                timestamp: now
            });
        }
        else if (value >= threshold.warning) {
            this.alerts.push({
                type: 'warning',
                message: `Performance warning: ${metricName} is ${value}`,
                metric: metricName,
                value,
                threshold: threshold.warning,
                timestamp: now
            });
        }
        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
    }
    getMemoryUsage() {
        if ('memory' in performance) {
            return performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
    }
    getAverageMetric(metrics, name) {
        const filtered = metrics.filter(m => m.name === name);
        if (filtered.length === 0)
            return 0;
        return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
    }
    getLatestMetric(metrics, name) {
        const filtered = metrics.filter(m => m.name === name);
        if (filtered.length === 0)
            return 0;
        return filtered[filtered.length - 1].value;
    }
    getMetrics() {
        return [...this.metrics];
    }
    getSnapshots() {
        return [...this.snapshots];
    }
    getAlerts() {
        return [...this.alerts];
    }
    getRecentAlerts(timeWindow = 5000) {
        const now = performance.now();
        return this.alerts.filter(alert => now - alert.timestamp < timeWindow);
    }
    generateReport() {
        const duration = performance.now() - this.startTime;
        const avgFps = this.getAverageMetric(this.metrics, 'fps');
        const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
        const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
        const criticalAlerts = this.alerts.filter(a => a.type === 'critical').length;
        const warningAlerts = this.alerts.filter(a => a.type === 'warning').length;
        return {
            duration,
            frameCount: this.frameCount,
            averageFps: avgFps,
            averageFrameTime: avgFrameTime,
            maxMemoryUsage: maxMemory,
            totalMetrics: this.metrics.length,
            totalSnapshots: this.snapshots.length,
            criticalAlerts,
            warningAlerts,
            performanceScore: this.calculatePerformanceScore(),
            recommendations: this.generateRecommendations()
        };
    }
    calculatePerformanceScore() {
        const avgFps = this.getAverageMetric(this.metrics, 'fps');
        const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
        const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
        let score = 100;
        // Deduct points for poor FPS
        if (avgFps < 60)
            score -= (60 - avgFps) * 2;
        if (avgFps < 30)
            score -= 20;
        // Deduct points for high frame time
        if (avgFrameTime > 16.67)
            score -= (avgFrameTime - 16.67) * 2;
        // Deduct points for high memory usage
        if (maxMemory > 64)
            score -= (maxMemory - 64) * 0.5;
        // Deduct points for alerts
        score -= this.alerts.filter(a => a.type === 'critical').length * 10;
        score -= this.alerts.filter(a => a.type === 'warning').length * 5;
        return Math.max(0, Math.min(100, score));
    }
    generateRecommendations() {
        const recommendations = [];
        const avgFps = this.getAverageMetric(this.metrics, 'fps');
        const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
        const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
        const avgDrawCalls = this.getAverageMetric(this.metrics, 'drawCalls');
        if (avgFps < 45) {
            recommendations.push('Consider reducing visual complexity or optimizing render pipeline');
        }
        if (avgFrameTime > 20) {
            recommendations.push('Frame time is high - profile individual systems for bottlenecks');
        }
        if (maxMemory > 80) {
            recommendations.push('Memory usage is high - check for memory leaks or optimize asset loading');
        }
        if (avgDrawCalls > 100) {
            recommendations.push('High draw call count - consider batching sprites or reducing visual elements');
        }
        if (this.alerts.filter(a => a.type === 'critical').length > 5) {
            recommendations.push('Multiple critical performance issues detected - consider reducing game complexity');
        }
        if (recommendations.length === 0) {
            recommendations.push('Performance looks good! No major issues detected.');
        }
        return recommendations;
    }
    setThreshold(metric, warning, critical) {
        if (this.thresholds[metric]) {
            this.thresholds[metric] = { warning, critical };
        }
    }
    clearData() {
        this.metrics = [];
        this.snapshots = [];
        this.alerts = [];
        this.frameCount = 0;
    }
    exportData() {
        return JSON.stringify({
            metrics: this.metrics,
            snapshots: this.snapshots,
            alerts: this.alerts,
            report: this.generateReport()
        }, null, 2);
    }
}

/**
 * Asset Preview and Debugging Tools
 * Provides visual preview and analysis of game assets
 */
class AssetPreviewManager {
    constructor() {
        this.assets = new Map();
        this.loadedImages = new Map();
        this.loadedAudio = new Map();
        this.loadedFonts = new Map();
        this.assetUsage = new Map();
        this.setupFontLoadingDetection();
    }
    setupFontLoadingDetection() {
        if ('fonts' in document) {
            document.fonts.addEventListener('loadingdone', (event) => {
                console.log('Font loading completed:', event);
            });
        }
    }
    async loadCartridgeAssets(cartridge) {
        this.clearAssets();
        // Analyze asset usage
        this.analyzeAssetUsage(cartridge);
        // Load sprites
        const spritePromises = cartridge.assets.sprites.map(sprite => this.loadSprite(sprite));
        // Load audio
        const audioPromises = cartridge.assets.audio.map(audio => this.loadAudio(audio));
        // Load fonts
        const fontPromises = cartridge.assets.fonts.map(font => this.loadFont(font));
        // Wait for all assets to load
        await Promise.allSettled([
            ...spritePromises,
            ...audioPromises,
            ...fontPromises
        ]);
        console.log(`Loaded ${this.assets.size} assets`);
    }
    async loadSprite(sprite) {
        const startTime = performance.now();
        const assetInfo = {
            id: sprite.id,
            type: 'sprite',
            url: sprite.url,
            loaded: false,
            dimensions: { width: sprite.width, height: sprite.height },
            format: this.detectImageFormat(sprite.url)
        };
        this.assets.set(sprite.id, assetInfo);
        try {
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    assetInfo.loaded = true;
                    assetInfo.loadTime = performance.now() - startTime;
                    assetInfo.size = this.estimateImageSize(img);
                    this.loadedImages.set(sprite.id, img);
                    resolve();
                };
                img.onerror = () => {
                    assetInfo.error = 'Failed to load image';
                    reject(new Error(`Failed to load sprite: ${sprite.id}`));
                };
                img.src = sprite.url;
            });
        }
        catch (error) {
            assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to load sprite ${sprite.id}:`, error);
        }
    }
    async loadAudio(audio) {
        const startTime = performance.now();
        const assetInfo = {
            id: audio.id,
            type: 'audio',
            url: audio.url,
            loaded: false,
            format: this.detectAudioFormat(audio.url)
        };
        this.assets.set(audio.id, assetInfo);
        try {
            const audioElement = new Audio();
            await new Promise((resolve, reject) => {
                audioElement.addEventListener('canplaythrough', () => {
                    assetInfo.loaded = true;
                    assetInfo.loadTime = performance.now() - startTime;
                    assetInfo.duration = audioElement.duration;
                    assetInfo.size = this.estimateAudioSize(audioElement);
                    this.loadedAudio.set(audio.id, audioElement);
                    resolve();
                });
                audioElement.addEventListener('error', () => {
                    assetInfo.error = 'Failed to load audio';
                    reject(new Error(`Failed to load audio: ${audio.id}`));
                });
                audioElement.src = audio.url;
                audioElement.load();
            });
        }
        catch (error) {
            assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to load audio ${audio.id}:`, error);
        }
    }
    async loadFont(font) {
        const startTime = performance.now();
        const assetInfo = {
            id: font.id,
            type: 'font',
            url: font.url,
            loaded: false,
            format: this.detectFontFormat(font.url)
        };
        this.assets.set(font.id, assetInfo);
        try {
            if ('FontFace' in window) {
                const fontFace = new FontFace(font.family, `url(${font.url})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                assetInfo.loaded = true;
                assetInfo.loadTime = performance.now() - startTime;
                this.loadedFonts.set(font.id, fontFace);
            }
            else {
                // Fallback for older browsers
                const style = document.createElement('style');
                style.textContent = `
          @font-face {
            font-family: '${font.family}';
            src: url('${font.url}');
          }
        `;
                document.head.appendChild(style);
                assetInfo.loaded = true;
                assetInfo.loadTime = performance.now() - startTime;
            }
        }
        catch (error) {
            assetInfo.error = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to load font ${font.id}:`, error);
        }
    }
    analyzeAssetUsage(cartridge) {
        this.assetUsage.clear();
        // Initialize usage tracking for all assets
        [...cartridge.assets.sprites, ...cartridge.assets.audio, ...cartridge.assets.fonts]
            .forEach(asset => {
            this.assetUsage.set(asset.id, {
                assetId: asset.id,
                usedBy: [],
                usageCount: 0
            });
        });
        // Analyze scene nodes for asset usage
        cartridge.scenes.forEach(scene => {
            this.analyzeNodeAssetUsage(scene.root);
        });
    }
    analyzeNodeAssetUsage(node) {
        // Check sprite usage
        if (node.sprite && this.assetUsage.has(node.sprite)) {
            const usage = this.assetUsage.get(node.sprite);
            usage.usedBy.push(node.id);
            usage.usageCount++;
        }
        // Check audio usage in actions
        if (node.actions) {
            node.actions.forEach((action) => {
                if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params.id) {
                    const usage = this.assetUsage.get(action.params.id);
                    if (usage) {
                        usage.usedBy.push(node.id);
                        usage.usageCount++;
                    }
                }
            });
        }
        // Check triggers for audio usage
        if (node.triggers) {
            node.triggers.forEach((trigger) => {
                trigger.actions?.forEach((action) => {
                    if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params.id) {
                        const usage = this.assetUsage.get(action.params.id);
                        if (usage) {
                            usage.usedBy.push(node.id);
                            usage.usageCount++;
                        }
                    }
                });
            });
        }
        // Recursively check children
        if (node.children) {
            node.children.forEach((child) => this.analyzeNodeAssetUsage(child));
        }
    }
    detectImageFormat(url) {
        if (url.startsWith('data:image/')) {
            const match = url.match(/data:image\/([^;]+)/);
            return match ? match[1].toUpperCase() : 'Unknown';
        }
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'png': return 'PNG';
            case 'jpg':
            case 'jpeg': return 'JPEG';
            case 'gif': return 'GIF';
            case 'webp': return 'WebP';
            case 'svg': return 'SVG';
            default: return 'Unknown';
        }
    }
    detectAudioFormat(url) {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'mp3': return 'MP3';
            case 'wav': return 'WAV';
            case 'ogg': return 'OGG';
            case 'aac': return 'AAC';
            case 'm4a': return 'M4A';
            default: return 'Unknown';
        }
    }
    detectFontFormat(url) {
        const extension = url.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'woff': return 'WOFF';
            case 'woff2': return 'WOFF2';
            case 'ttf': return 'TTF';
            case 'otf': return 'OTF';
            case 'eot': return 'EOT';
            default: return 'Unknown';
        }
    }
    estimateImageSize(img) {
        // Rough estimation based on dimensions and assumed bit depth
        return img.width * img.height * 4; // 4 bytes per pixel (RGBA)
    }
    estimateAudioSize(audio) {
        // Very rough estimation - would need actual file size for accuracy
        if (audio.duration) {
            return audio.duration * 44100 * 2 * 2; // 44.1kHz, stereo, 16-bit
        }
        return 0;
    }
    getAssetInfo(id) {
        return this.assets.get(id);
    }
    getAllAssets() {
        return Array.from(this.assets.values());
    }
    getLoadedAssets() {
        return Array.from(this.assets.values()).filter(asset => asset.loaded);
    }
    getFailedAssets() {
        return Array.from(this.assets.values()).filter(asset => asset.error);
    }
    getAssetsByType(type) {
        return Array.from(this.assets.values()).filter(asset => asset.type === type);
    }
    getAssetUsage(id) {
        return this.assetUsage.get(id);
    }
    getUnusedAssets() {
        return Array.from(this.assets.values()).filter(asset => {
            const usage = this.assetUsage.get(asset.id);
            return !usage || usage.usageCount === 0;
        });
    }
    getTotalSize() {
        return Array.from(this.assets.values())
            .reduce((total, asset) => total + (asset.size || 0), 0);
    }
    getLoadingStats() {
        const assets = Array.from(this.assets.values());
        const loaded = assets.filter(a => a.loaded);
        const failed = assets.filter(a => a.error);
        const pending = assets.filter(a => !a.loaded && !a.error);
        const totalLoadTime = loaded.reduce((sum, asset) => sum + (asset.loadTime || 0), 0);
        const averageLoadTime = loaded.length > 0 ? totalLoadTime / loaded.length : 0;
        return {
            total: assets.length,
            loaded: loaded.length,
            failed: failed.length,
            pending: pending.length,
            averageLoadTime
        };
    }
    createPreviewElement(assetId) {
        const asset = this.assets.get(assetId);
        if (!asset || !asset.loaded)
            return null;
        const container = document.createElement('div');
        container.className = 'asset-preview-item';
        container.style.cssText = `
      border: 1px solid #3e3e42;
      border-radius: 4px;
      padding: 8px;
      margin: 4px;
      background: #252526;
      display: inline-block;
      text-align: center;
      min-width: 100px;
    `;
        const header = document.createElement('div');
        header.style.cssText = 'font-size: 11px; margin-bottom: 4px; color: #d4d4d4;';
        header.textContent = `${asset.id} (${asset.type})`;
        container.appendChild(header);
        if (asset.type === 'sprite') {
            const img = this.loadedImages.get(assetId);
            if (img) {
                const preview = img.cloneNode();
                preview.style.cssText = `
          max-width: 80px;
          max-height: 80px;
          image-rendering: pixelated;
          border: 1px solid #555;
        `;
                container.appendChild(preview);
                const info = document.createElement('div');
                info.style.cssText = 'font-size: 10px; color: #888; margin-top: 4px;';
                info.textContent = `${asset.dimensions?.width}×${asset.dimensions?.height} ${asset.format}`;
                container.appendChild(info);
            }
        }
        else if (asset.type === 'audio') {
            const icon = document.createElement('div');
            icon.style.cssText = 'font-size: 32px; margin: 8px 0;';
            icon.textContent = '🔊';
            container.appendChild(icon);
            const info = document.createElement('div');
            info.style.cssText = 'font-size: 10px; color: #888;';
            info.textContent = `${asset.duration?.toFixed(1)}s ${asset.format}`;
            container.appendChild(info);
            // Add play button
            const playBtn = document.createElement('button');
            playBtn.textContent = '▶';
            playBtn.style.cssText = `
        background: #0e639c;
        color: white;
        border: none;
        padding: 2px 6px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 10px;
        margin-top: 4px;
      `;
            playBtn.onclick = () => this.playAudio(assetId);
            container.appendChild(playBtn);
        }
        else if (asset.type === 'font') {
            const sample = document.createElement('div');
            sample.style.cssText = `
        font-family: '${this.loadedFonts.get(assetId)?.family || 'monospace'}';
        font-size: 16px;
        margin: 8px 0;
        color: #d4d4d4;
      `;
            sample.textContent = 'Abc 123';
            container.appendChild(sample);
            const info = document.createElement('div');
            info.style.cssText = 'font-size: 10px; color: #888;';
            info.textContent = asset.format || 'Unknown';
            container.appendChild(info);
        }
        // Add usage info
        const usage = this.assetUsage.get(assetId);
        if (usage) {
            const usageInfo = document.createElement('div');
            usageInfo.style.cssText = 'font-size: 9px; color: #666; margin-top: 4px;';
            usageInfo.textContent = `Used ${usage.usageCount} times`;
            container.appendChild(usageInfo);
        }
        return container;
    }
    playAudio(assetId) {
        const audio = this.loadedAudio.get(assetId);
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.warn('Failed to play audio:', error);
            });
        }
    }
    exportAssetReport() {
        const stats = this.getLoadingStats();
        const unusedAssets = this.getUnusedAssets();
        const failedAssets = this.getFailedAssets();
        const report = {
            summary: {
                totalAssets: stats.total,
                loadedAssets: stats.loaded,
                failedAssets: stats.failed,
                pendingAssets: stats.pending,
                averageLoadTime: stats.averageLoadTime,
                totalSize: this.getTotalSize()
            },
            assetsByType: {
                sprites: this.getAssetsByType('sprite').length,
                audio: this.getAssetsByType('audio').length,
                fonts: this.getAssetsByType('font').length
            },
            issues: {
                unusedAssets: unusedAssets.map(a => ({ id: a.id, type: a.type })),
                failedAssets: failedAssets.map(a => ({ id: a.id, type: a.type, error: a.error }))
            },
            assets: Array.from(this.assets.values()),
            usage: Array.from(this.assetUsage.values())
        };
        return JSON.stringify(report, null, 2);
    }
    clearAssets() {
        this.assets.clear();
        this.loadedImages.clear();
        this.loadedAudio.clear();
        this.loadedFonts.clear();
        this.assetUsage.clear();
    }
}

/**
 * Build Export Utility
 * Generates optimized builds for different deployment targets
 */
class BuildExporter {
    constructor() {
        this.engineCode = '';
        this.moduleCode = new Map();
        this.loadEngineCode();
    }
    async loadEngineCode() {
        try {
            // In a real implementation, this would load the actual engine files
            const response = await fetch('./dist/llmrt.min.js');
            this.engineCode = await response.text();
        }
        catch (error) {
            console.warn('Could not load engine code for export:', error);
            this.engineCode = '// Engine code would be loaded here';
        }
    }
    async exportBuild(config) {
        const startTime = performance.now();
        const result = {
            success: false,
            files: new Map(),
            size: 0,
            warnings: [],
            errors: [],
            optimizations: [],
            buildTime: 0
        };
        try {
            // Validate cartridge
            const validationResult = this.validateCartridge(config.cartridge);
            if (!validationResult.valid) {
                result.errors.push(...validationResult.errors);
                return result;
            }
            // Apply optimizations
            const optimizedCartridge = await this.optimizeCartridge(config.cartridge, config.optimization);
            // Generate build files
            await this.generateBuildFiles(config, optimizedCartridge, result);
            // Calculate total size
            result.size = this.calculateTotalSize(result.files);
            // Generate optimization report
            this.generateOptimizationReport(config, result);
            result.success = true;
            result.buildTime = performance.now() - startTime;
        }
        catch (error) {
            result.errors.push(`Build failed: ${error}`);
        }
        return result;
    }
    validateCartridge(cartridge) {
        const errors = [];
        if (!cartridge.version) {
            errors.push('Missing cartridge version');
        }
        if (!cartridge.metadata?.title) {
            errors.push('Missing cartridge title');
        }
        if (!cartridge.scenes || cartridge.scenes.length === 0) {
            errors.push('No scenes defined');
        }
        return { valid: errors.length === 0, errors };
    }
    async optimizeCartridge(cartridge, optimization) {
        const optimized = JSON.parse(JSON.stringify(cartridge));
        if (optimization.removeUnusedAssets) {
            this.removeUnusedAssets(optimized);
        }
        if (optimization.compressAssets) {
            await this.compressAssets(optimized);
        }
        if (optimization.minify) {
            this.minifyCartridge(optimized);
        }
        return optimized;
    }
    removeUnusedAssets(cartridge) {
        const usedAssets = new Set();
        // Collect used assets from scenes
        cartridge.scenes.forEach(scene => {
            this.collectUsedAssets(scene.root, usedAssets);
        });
        // Filter assets
        const originalSpriteCount = cartridge.assets.sprites.length;
        const originalAudioCount = cartridge.assets.audio.length;
        const originalFontCount = cartridge.assets.fonts.length;
        cartridge.assets.sprites = cartridge.assets.sprites.filter(sprite => usedAssets.has(sprite.id));
        cartridge.assets.audio = cartridge.assets.audio.filter(audio => usedAssets.has(audio.id));
        cartridge.assets.fonts = cartridge.assets.fonts.filter(font => usedAssets.has(font.id));
        const removedSprites = originalSpriteCount - cartridge.assets.sprites.length;
        const removedAudio = originalAudioCount - cartridge.assets.audio.length;
        const removedFonts = originalFontCount - cartridge.assets.fonts.length;
        if (removedSprites > 0 || removedAudio > 0 || removedFonts > 0) {
            console.log(`Removed unused assets: ${removedSprites} sprites, ${removedAudio} audio, ${removedFonts} fonts`);
        }
    }
    collectUsedAssets(node, usedAssets) {
        // Check sprite usage
        if (node.sprite) {
            usedAssets.add(node.sprite);
        }
        // Check audio usage in actions
        if (node.actions) {
            node.actions.forEach((action) => {
                if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params?.id) {
                    usedAssets.add(action.params.id);
                }
            });
        }
        // Check triggers for audio usage
        if (node.triggers) {
            node.triggers.forEach((trigger) => {
                trigger.actions?.forEach((action) => {
                    if ((action.type === 'playSfx' || action.type === 'playMusic') && action.params?.id) {
                        usedAssets.add(action.params.id);
                    }
                });
            });
        }
        // Recursively check children
        if (node.children) {
            node.children.forEach((child) => this.collectUsedAssets(child, usedAssets));
        }
    }
    async compressAssets(cartridge) {
        // In a real implementation, this would compress images and audio
        // For now, we'll just simulate the process
        console.log('Compressing assets...');
        // Simulate compression by adding a flag
        cartridge._compressed = true;
    }
    minifyCartridge(cartridge) {
        // Remove unnecessary whitespace and comments from string values
        const minifyString = (str) => {
            return str.trim().replace(/\s+/g, ' ');
        };
        // Minify metadata
        if (cartridge.metadata.description) {
            cartridge.metadata.description = minifyString(cartridge.metadata.description);
        }
        // Remove debug information from nodes
        cartridge.scenes.forEach(scene => {
            this.minifyNode(scene.root);
        });
    }
    minifyNode(node) {
        // Remove debug properties
        delete node._debug;
        delete node._comments;
        // Recursively minify children
        if (node.children) {
            node.children.forEach((child) => this.minifyNode(child));
        }
    }
    async generateBuildFiles(config, cartridge, result) {
        // Generate HTML file
        const html = this.generateHTML(config, cartridge);
        result.files.set('index.html', html);
        // Generate JavaScript files
        if (config.output.format === 'standalone') {
            // Include engine code directly
            const js = this.generateStandaloneJS(config, cartridge);
            result.files.set('game.js', js);
        }
        else {
            // Separate engine and game files
            result.files.set('llmrt.min.js', this.engineCode);
            const gameJS = this.generateGameJS(config, cartridge);
            result.files.set('game.js', gameJS);
        }
        // Generate cartridge file
        if (!config.output.bundleAssets) {
            const cartridgeJSON = JSON.stringify(cartridge, null, config.optimization.minify ? 0 : 2);
            result.files.set('cartridge.json', cartridgeJSON);
        }
        // Generate CSS file
        const css = this.generateCSS(config);
        result.files.set('style.css', css);
        // Generate manifest files for different targets
        if (config.target === 'mobile') {
            const manifest = this.generateWebAppManifest(cartridge);
            result.files.set('manifest.json', JSON.stringify(manifest, null, 2));
        }
        // Generate service worker for offline support
        if (config.target === 'web' || config.target === 'mobile') {
            const serviceWorker = this.generateServiceWorker(config, Array.from(result.files.keys()));
            result.files.set('sw.js', serviceWorker);
        }
        // Copy assets if not bundled
        if (!config.output.bundleAssets) {
            await this.copyAssets(cartridge, result);
        }
    }
    generateHTML(config, cartridge) {
        const title = cartridge.metadata.title;
        const description = cartridge.metadata.description;
        const includeManifest = config.target === 'mobile' ?
            '<link rel="manifest" href="manifest.json">' : '';
        const includeServiceWorker = (config.target === 'web' || config.target === 'mobile') ? `
      <script>
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('sw.js');
        }
      </script>
    ` : '';
        const viewport = config.target === 'mobile' ?
            '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">' :
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    ${viewport}
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${includeManifest}
    <link rel="stylesheet" href="style.css">
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }
        canvas {
            border: 1px solid #333;
            image-rendering: pixelated;
            max-width: 100vw;
            max-height: 100vh;
        }
        .loading {
            color: white;
            text-align: center;
        }
        .error {
            color: #ff6b6b;
            text-align: center;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div id="gameContainer">
        <canvas id="gameCanvas" width="800" height="600"></canvas>
        <div id="loading" class="loading">Loading...</div>
        <div id="error" class="error" style="display: none;"></div>
    </div>
    
    ${config.output.format === 'standalone' ?
            '<script src="game.js"></script>' :
            '<script src="llmrt.min.js"></script><script src="game.js"></script>'}
    ${includeServiceWorker}
</body>
</html>`;
    }
    generateStandaloneJS(config, cartridge) {
        const cartridgeData = config.output.bundleAssets ?
            JSON.stringify(cartridge) :
            'await fetch("cartridge.json").then(r => r.json())';
        return `${this.engineCode}

(async function() {
    try {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const canvas = document.getElementById('gameCanvas');
        
        const cartridge = ${cartridgeData};
        
        const engine = LLMRT.createEngine();
        await engine.loadCartridge(cartridge);
        
        loading.style.display = 'none';
        engine.start();
        
    } catch (err) {
        console.error('Failed to start game:', err);
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = 'Failed to load game: ' + err.message;
        errorDiv.style.display = 'block';
    }
})();`;
    }
    generateGameJS(config, cartridge) {
        const cartridgeData = config.output.bundleAssets ?
            JSON.stringify(cartridge) :
            'await fetch("cartridge.json").then(r => r.json())';
        return `(async function() {
    try {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const canvas = document.getElementById('gameCanvas');
        
        const cartridge = ${cartridgeData};
        
        const engine = LLMRT.createEngine();
        await engine.loadCartridge(cartridge);
        
        loading.style.display = 'none';
        engine.start();
        
    } catch (err) {
        console.error('Failed to start game:', err);
        document.getElementById('loading').style.display = 'none';
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = 'Failed to load game: ' + err.message;
        errorDiv.style.display = 'block';
    }
})();`;
    }
    generateCSS(config) {
        const mobileStyles = config.target === 'mobile' ? `
      @media (max-width: 768px) {
        canvas {
          width: 100vw !important;
          height: auto !important;
        }
      }
      
      /* Prevent zoom on double tap */
      * {
        touch-action: manipulation;
      }
    ` : '';
        return `/* Generated styles for ${config.target} target */
body {
    margin: 0;
    padding: 0;
    background: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: Arial, sans-serif;
    overflow: hidden;
}

canvas {
    border: 1px solid #333;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
}

.loading, .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
}

.loading {
    color: white;
}

.error {
    color: #ff6b6b;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px;
    border-radius: 8px;
    max-width: 80%;
    text-align: center;
}

${mobileStyles}`;
    }
    generateWebAppManifest(cartridge) {
        return {
            name: cartridge.metadata.title,
            short_name: cartridge.metadata.title,
            description: cartridge.metadata.description,
            start_url: "./",
            display: "fullscreen",
            orientation: "landscape",
            theme_color: "#000000",
            background_color: "#000000",
            icons: [
                {
                    src: "icon-192.png",
                    sizes: "192x192",
                    type: "image/png"
                },
                {
                    src: "icon-512.png",
                    sizes: "512x512",
                    type: "image/png"
                }
            ]
        };
    }
    generateServiceWorker(config, files) {
        const cacheFiles = files.filter(f => !f.endsWith('.map')).map(f => `'./${f}'`).join(',\n    ');
        return `const CACHE_NAME = 'llmrt-game-v1';
const urlsToCache = [
    './',
    ${cacheFiles}
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});`;
    }
    async copyAssets(cartridge, result) {
        // In a real implementation, this would copy asset files
        // For now, we'll just note which assets would be copied
        const assetFiles = [];
        cartridge.assets.sprites.forEach(sprite => {
            if (!sprite.url.startsWith('data:')) {
                assetFiles.push(sprite.url);
            }
        });
        cartridge.assets.audio.forEach(audio => {
            if (!audio.url.startsWith('data:')) {
                assetFiles.push(audio.url);
            }
        });
        cartridge.assets.fonts.forEach(font => {
            if (!font.url.startsWith('data:')) {
                assetFiles.push(font.url);
            }
        });
        // Add placeholder files for assets
        assetFiles.forEach(file => {
            result.files.set(file, `// Asset file: ${file}`);
        });
    }
    calculateTotalSize(files) {
        let totalSize = 0;
        files.forEach(content => {
            if (typeof content === 'string') {
                totalSize += new Blob([content]).size;
            }
            else {
                totalSize += content.length;
            }
        });
        return totalSize;
    }
    generateOptimizationReport(config, result) {
        if (config.optimization.removeUnusedAssets) {
            result.optimizations.push('Removed unused assets');
        }
        if (config.optimization.compressAssets) {
            result.optimizations.push('Compressed assets');
        }
        if (config.optimization.minify) {
            result.optimizations.push('Minified cartridge data');
        }
        if (config.optimization.treeShake) {
            result.optimizations.push('Tree-shaken unused code');
        }
        result.optimizations.push(`Generated ${result.files.size} files`);
        result.optimizations.push(`Total size: ${(result.size / 1024).toFixed(1)} KB`);
    }
    async createZipFile(files) {
        // Simple zip file creation (basic implementation)
        // In a real implementation, you'd use a proper zip library like JSZip
        const encoder = new TextEncoder();
        let zipContent = '';
        files.forEach((content, filename) => {
            zipContent += `=== ${filename} ===\n`;
            if (typeof content === 'string') {
                zipContent += content;
            }
            else {
                zipContent += `[Binary file: ${content.length} bytes]`;
            }
            zipContent += '\n\n';
        });
        return encoder.encode(zipContent);
    }
    getDefaultConfig(target = 'web') {
        return {
            cartridge: {}, // Will be set by caller
            optimization: {
                minify: true,
                treeShake: true,
                compressAssets: true,
                removeUnusedAssets: true,
                optimizeImages: false // Would require image processing library
            },
            target,
            features: {
                includeDebugInfo: false,
                includePerformanceMonitor: false,
                includeErrorReporting: true
            },
            output: {
                format: 'standalone',
                bundleAssets: true,
                generateSourceMaps: false
            }
        };
    }
}

/**
 * LLM Canvas Engine Playground
 * Interactive development environment for testing and debugging cartridges
 */
class PlaygroundApp {
    constructor() {
        this.engine = null;
        this.performanceMetrics = [];
        this.isRunning = false;
        this.currentCartridge = null;
        this.assets = [];
        this.performanceMonitorId = null;
        this.canvas = document.getElementById('gameCanvas');
        this.editor = document.getElementById('cartridgeEditor');
        this.validationPanel = document.getElementById('validationPanel');
        this.consolePanel = document.getElementById('consolePanel');
        this.frameTimeChart = document.getElementById('frameTimeChart');
        this.memoryChart = document.getElementById('memoryChart');
        // Initialize utilities
        this.profiler = new PerformanceProfiler();
        this.assetManager = new AssetPreviewManager();
        this.buildExporter = new BuildExporter();
        this.initializeEventListeners();
        this.initializeDebugTabs();
        this.setupConsoleCapture();
        this.log('Playground initialized', 'info');
    }
    initializeEventListeners() {
        // Toolbar buttons
        document.getElementById('loadBtn')?.addEventListener('click', () => this.loadCartridge());
        document.getElementById('runBtn')?.addEventListener('click', () => this.runCartridge());
        document.getElementById('stopBtn')?.addEventListener('click', () => this.stopCartridge());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetCartridge());
        document.getElementById('validateBtn')?.addEventListener('click', () => this.validateCurrentCartridge());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportBuild());
        // Sample selector
        const sampleSelect = document.getElementById('sampleSelect');
        sampleSelect.addEventListener('change', (e) => {
            const target = e.target;
            if (target.value) {
                this.loadSample(target.value);
                target.value = '';
            }
        });
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => this.handleFileLoad(e));
        // Editor changes
        this.editor.addEventListener('input', () => {
            this.debounce(() => this.validateCurrentCartridge().catch(console.error), 500);
        });
        // Canvas resize
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }
    initializeDebugTabs() {
        const tabs = document.querySelectorAll('.debug-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target;
                const tabName = target.dataset.tab;
                if (tabName) {
                    this.switchDebugTab(tabName);
                }
            });
        });
    }
    switchDebugTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.debug-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        // Show/hide content
        document.querySelectorAll('.debug-tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(`${tabName}Tab`)?.classList.remove('hidden');
        // Update content based on tab
        switch (tabName) {
            case 'assets':
                this.updateAssetPreview();
                break;
            case 'scene':
                this.updateSceneTree();
                break;
        }
    }
    setupConsoleCapture() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.log(args.join(' '), 'info');
        };
        console.error = (...args) => {
            originalError.apply(console, args);
            this.log(args.join(' '), 'error');
        };
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.log(args.join(' '), 'warn');
        };
    }
    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `console-entry console-${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.consolePanel.appendChild(entry);
        this.consolePanel.scrollTop = this.consolePanel.scrollHeight;
        // Keep only last 100 entries
        while (this.consolePanel.children.length > 100) {
            this.consolePanel.removeChild(this.consolePanel.firstChild);
        }
    }
    async loadCartridge() {
        const fileInput = document.getElementById('fileInput');
        fileInput.click();
    }
    async handleFileLoad(event) {
        const target = event.target;
        const file = target.files?.[0];
        if (!file)
            return;
        try {
            const text = await file.text();
            this.editor.value = text;
            this.validateCurrentCartridge();
            this.log(`Loaded cartridge: ${file.name}`, 'info');
        }
        catch (error) {
            this.log(`Failed to load file: ${error}`, 'error');
        }
    }
    async loadSample(sampleName) {
        try {
            const response = await fetch(`./test-samples/${sampleName}.lgf.json`);
            if (!response.ok) {
                throw new Error(`Failed to load sample: ${response.statusText}`);
            }
            const text = await response.text();
            this.editor.value = text;
            this.validateCurrentCartridge();
            this.log(`Loaded sample: ${sampleName}`, 'info');
        }
        catch (error) {
            this.log(`Failed to load sample: ${error}`, 'error');
        }
    }
    async validateCurrentCartridge() {
        const text = this.editor.value.trim();
        if (!text) {
            this.showValidationResult({ valid: false, errors: [{ path: '', message: 'No cartridge data', code: 'EMPTY_CARTRIDGE' }], warnings: [] });
            return;
        }
        try {
            const cartridge = JSON.parse(text);
            const result = validateCartridge(cartridge);
            this.showValidationResult(result);
            if (result.valid) {
                this.currentCartridge = cartridge;
                this.extractAssets(cartridge);
                await this.assetManager.loadCartridgeAssets(cartridge);
                this.updateButtons();
            }
            else {
                this.currentCartridge = null;
                this.updateButtons();
            }
        }
        catch (error) {
            this.showValidationResult({
                valid: false,
                errors: [{ path: 'JSON', message: `Parse error: ${error}`, code: 'JSON_PARSE_ERROR' }],
                warnings: []
            });
            this.currentCartridge = null;
            this.updateButtons();
        }
    }
    showValidationResult(result) {
        this.validationPanel.innerHTML = '';
        if (result.valid) {
            const success = document.createElement('div');
            success.className = 'validation-success';
            success.textContent = '✓ Cartridge is valid';
            this.validationPanel.appendChild(success);
        }
        result.errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-error';
            errorDiv.innerHTML = `<strong>${error.path || 'Error'}:</strong> ${error.message}`;
            this.validationPanel.appendChild(errorDiv);
        });
        result.warnings.forEach(warning => {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'validation-warning';
            warningDiv.innerHTML = `<strong>${warning.path || 'Warning'}:</strong> ${warning.message}`;
            this.validationPanel.appendChild(warningDiv);
        });
    }
    extractAssets(cartridge) {
        this.assets = [];
        cartridge.assets.sprites.forEach(sprite => {
            this.assets.push({
                id: sprite.id,
                type: 'sprite',
                url: sprite.url,
                loaded: false
            });
        });
        cartridge.assets.audio.forEach(audio => {
            this.assets.push({
                id: audio.id,
                type: 'audio',
                url: audio.url,
                loaded: false
            });
        });
        cartridge.assets.fonts.forEach(font => {
            this.assets.push({
                id: font.id,
                type: 'font',
                url: font.url,
                loaded: false
            });
        });
    }
    async runCartridge() {
        if (!this.currentCartridge) {
            this.log('No valid cartridge to run', 'error');
            return;
        }
        try {
            this.showLoading(true);
            this.log('Starting cartridge...', 'info');
            // Create new engine instance
            this.engine = createEngine();
            // Load cartridge
            await this.engine.loadCartridge(this.currentCartridge);
            // Start engine
            this.engine.start();
            this.isRunning = true;
            this.updateButtons();
            this.startPerformanceMonitoring();
            this.log('Cartridge started successfully', 'info');
        }
        catch (error) {
            this.log(`Failed to run cartridge: ${error}`, 'error');
        }
        finally {
            this.showLoading(false);
        }
    }
    stopCartridge() {
        if (this.engine) {
            this.engine.stop();
            this.engine = null;
        }
        this.isRunning = false;
        this.stopPerformanceMonitoring();
        this.updateButtons();
        this.log('Cartridge stopped', 'info');
    }
    resetCartridge() {
        this.stopCartridge();
        this.performanceMetrics = [];
        this.clearPerformanceCharts();
        this.log('Cartridge reset', 'info');
    }
    startPerformanceMonitoring() {
        if (this.performanceMonitorId)
            return;
        this.profiler.startRecording();
        let lastTime = performance.now();
        let frameCount = 0;
        let fpsSum = 0;
        let minFps = Infinity;
        let maxFps = 0;
        const monitor = () => {
            if (!this.isRunning)
                return;
            const currentTime = performance.now();
            const frameTime = currentTime - lastTime;
            const fps = 1000 / frameTime;
            frameCount++;
            fpsSum += fps;
            minFps = Math.min(minFps, fps);
            maxFps = Math.max(maxFps, fps);
            // Record profiler metrics
            this.profiler.recordFrame(frameTime);
            this.profiler.recordMemoryUsage();
            // Update FPS counter
            const fpsCounter = document.getElementById('fpsCounter');
            if (fpsCounter) {
                fpsCounter.textContent = `FPS: ${Math.round(fps)}`;
            }
            // Store metrics
            this.performanceMetrics.push({
                frameTime,
                fps,
                memoryUsage: this.getMemoryUsage(),
                timestamp: currentTime
            });
            // Keep only last 300 samples (5 seconds at 60fps)
            if (this.performanceMetrics.length > 300) {
                this.performanceMetrics.shift();
            }
            // Update charts every 10 frames
            if (frameCount % 10 === 0) {
                this.updatePerformanceCharts();
                this.updatePerformanceStats(fpsSum / frameCount, minFps, maxFps);
            }
            lastTime = currentTime;
            this.performanceMonitorId = requestAnimationFrame(monitor);
        };
        this.performanceMonitorId = requestAnimationFrame(monitor);
    }
    stopPerformanceMonitoring() {
        if (this.performanceMonitorId) {
            cancelAnimationFrame(this.performanceMonitorId);
            this.performanceMonitorId = null;
        }
        if (this.profiler) {
            const report = this.profiler.stopRecording();
            this.log(`Performance Report - Score: ${report.performanceScore}/100, Avg FPS: ${report.averageFps.toFixed(1)}`, 'info');
        }
    }
    getMemoryUsage() {
        // Estimate memory usage (not precise but gives an indication)
        if ('memory' in performance) {
            return performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
    }
    updatePerformanceCharts() {
        this.drawFrameTimeChart();
        this.drawMemoryChart();
    }
    drawFrameTimeChart() {
        const ctx = this.frameTimeChart.getContext('2d');
        if (!ctx || this.performanceMetrics.length === 0)
            return;
        const width = this.frameTimeChart.width;
        const height = this.frameTimeChart.height;
        ctx.clearRect(0, 0, width, height);
        // Draw background
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, 0, width, height);
        // Draw grid
        ctx.strokeStyle = '#3e3e42';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        // Draw frame time line
        if (this.performanceMetrics.length > 1) {
            ctx.strokeStyle = '#89d185';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const maxFrameTime = Math.max(...this.performanceMetrics.map(m => m.frameTime));
            const minFrameTime = Math.min(...this.performanceMetrics.map(m => m.frameTime));
            const range = Math.max(maxFrameTime - minFrameTime, 1);
            this.performanceMetrics.forEach((metric, index) => {
                const x = (index / (this.performanceMetrics.length - 1)) * width;
                const y = height - ((metric.frameTime - minFrameTime) / range) * height;
                if (index === 0) {
                    ctx.moveTo(x, y);
                }
                else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }
        // Draw 16.67ms line (60fps target)
        ctx.strokeStyle = '#ffcc02';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        const targetY = height * 0.3; // Approximate position for 16.67ms
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(width, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    drawMemoryChart() {
        const ctx = this.memoryChart.getContext('2d');
        if (!ctx || this.performanceMetrics.length === 0)
            return;
        const width = this.memoryChart.width;
        const height = this.memoryChart.height;
        ctx.clearRect(0, 0, width, height);
        // Draw background
        ctx.fillStyle = '#252526';
        ctx.fillRect(0, 0, width, height);
        // Draw grid
        ctx.strokeStyle = '#3e3e42';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        // Draw memory usage line
        if (this.performanceMetrics.length > 1) {
            ctx.strokeStyle = '#75beff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const memoryValues = this.performanceMetrics.map(m => m.memoryUsage).filter(m => m > 0);
            if (memoryValues.length > 0) {
                const maxMemory = Math.max(...memoryValues);
                const minMemory = Math.min(...memoryValues);
                const range = Math.max(maxMemory - minMemory, 1);
                this.performanceMetrics.forEach((metric, index) => {
                    if (metric.memoryUsage > 0) {
                        const x = (index / (this.performanceMetrics.length - 1)) * width;
                        const y = height - ((metric.memoryUsage - minMemory) / range) * height;
                        if (index === 0) {
                            ctx.moveTo(x, y);
                        }
                        else {
                            ctx.lineTo(x, y);
                        }
                    }
                });
                ctx.stroke();
            }
        }
    }
    updatePerformanceStats(avgFps, minFps, maxFps) {
        const avgFrameTime = 1000 / avgFps;
        const currentMemory = this.performanceMetrics.length > 0 ?
            this.performanceMetrics[this.performanceMetrics.length - 1].memoryUsage : 0;
        document.getElementById('avgFrameTime').textContent = avgFrameTime.toFixed(2);
        document.getElementById('minFps').textContent = Math.round(minFps).toString();
        document.getElementById('maxFps').textContent = Math.round(maxFps).toString();
        document.getElementById('memoryUsage').textContent = currentMemory.toFixed(1);
    }
    clearPerformanceCharts() {
        const frameCtx = this.frameTimeChart.getContext('2d');
        const memoryCtx = this.memoryChart.getContext('2d');
        if (frameCtx) {
            frameCtx.clearRect(0, 0, this.frameTimeChart.width, this.frameTimeChart.height);
        }
        if (memoryCtx) {
            memoryCtx.clearRect(0, 0, this.memoryChart.width, this.memoryChart.height);
        }
        // Reset stats
        document.getElementById('avgFrameTime').textContent = '--';
        document.getElementById('minFps').textContent = '--';
        document.getElementById('maxFps').textContent = '--';
        document.getElementById('memoryUsage').textContent = '--';
    }
    updateAssetPreview() {
        const assetPreview = document.getElementById('assetPreview');
        if (!assetPreview)
            return;
        assetPreview.innerHTML = '';
        const assets = this.assetManager.getAllAssets();
        if (assets.length === 0) {
            const noAssets = document.createElement('div');
            noAssets.className = 'asset-item';
            noAssets.textContent = 'No assets loaded';
            assetPreview.appendChild(noAssets);
            return;
        }
        assets.forEach(asset => {
            const previewElement = this.assetManager.createPreviewElement(asset.id);
            if (previewElement) {
                assetPreview.appendChild(previewElement);
            }
        });
        // Show asset statistics
        const stats = this.assetManager.getLoadingStats();
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'grid-column: 1 / -1; padding: 8px; font-size: 11px; color: #888; border-top: 1px solid #3e3e42; margin-top: 8px;';
        statsDiv.innerHTML = `
      Assets: ${stats.loaded}/${stats.total} loaded
      ${stats.failed > 0 ? `<span style="color: #f14c4c;">${stats.failed} failed</span>` : ''}
      Avg load time: ${stats.averageLoadTime.toFixed(1)}ms
    `;
        assetPreview.appendChild(statsDiv);
    }
    updateSceneTree() {
        const sceneTree = document.getElementById('sceneTree');
        if (!sceneTree)
            return;
        if (!this.currentCartridge) {
            sceneTree.textContent = 'No scene loaded';
            return;
        }
        sceneTree.innerHTML = '';
        this.currentCartridge.scenes.forEach(scene => {
            const sceneDiv = document.createElement('div');
            sceneDiv.innerHTML = `<strong>Scene: ${scene.id}</strong>`;
            sceneTree.appendChild(sceneDiv);
            const treeDiv = document.createElement('div');
            treeDiv.style.marginLeft = '16px';
            treeDiv.innerHTML = this.renderNodeTree(scene.root, 0);
            sceneTree.appendChild(treeDiv);
        });
    }
    renderNodeTree(node, depth) {
        const indent = '  '.repeat(depth);
        let html = `${indent}├─ ${node.id} (${node.type})<br>`;
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                html += this.renderNodeTree(child, depth + 1);
            });
        }
        return html;
    }
    async exportBuild() {
        if (!this.currentCartridge) {
            this.log('No cartridge to export', 'error');
            return;
        }
        try {
            this.showLoading(true);
            this.log('Generating build...', 'info');
            // Create build configuration
            const buildConfig = this.buildExporter.getDefaultConfig('web');
            buildConfig.cartridge = this.currentCartridge;
            // Generate build
            const result = await this.buildExporter.exportBuild(buildConfig);
            if (!result.success) {
                result.errors.forEach(error => this.log(error, 'error'));
                return;
            }
            // Show build results
            result.warnings.forEach(warning => this.log(warning, 'warn'));
            result.optimizations.forEach(opt => this.log(opt, 'info'));
            // Create zip file
            const zip = await this.buildExporter.createZipFile(result.files);
            // Download zip
            const blob = new Blob([zip], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentCartridge.metadata.title.replace(/\s+/g, '-').toLowerCase()}-build.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.log(`Build exported successfully (${(result.size / 1024).toFixed(1)} KB, ${result.buildTime.toFixed(0)}ms)`, 'info');
        }
        catch (error) {
            this.log(`Export failed: ${error}`, 'error');
        }
        finally {
            this.showLoading(false);
        }
    }
    updateButtons() {
        const runBtn = document.getElementById('runBtn');
        const stopBtn = document.getElementById('stopBtn');
        const resetBtn = document.getElementById('resetBtn');
        const exportBtn = document.getElementById('exportBtn');
        runBtn.disabled = !this.currentCartridge || this.isRunning;
        stopBtn.disabled = !this.isRunning;
        resetBtn.disabled = !this.currentCartridge;
        exportBtn.disabled = !this.currentCartridge;
        const statusText = document.getElementById('statusText');
        if (statusText) {
            if (this.isRunning) {
                statusText.textContent = 'Running';
            }
            else if (this.currentCartridge) {
                statusText.textContent = 'Ready';
            }
            else {
                statusText.textContent = 'No cartridge';
            }
        }
    }
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
    }
    resizeCanvas() {
        // Keep canvas at fixed size for now
        // Could implement responsive sizing here
    }
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
}
// Initialize playground when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlaygroundApp();
});

export { PlaygroundApp };
