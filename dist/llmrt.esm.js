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
    getPointerWorldPosition(_camera) {
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
 * Convenience function to create a cartridge loader
 */
function createCartridgeLoader(assetManager, audioManager) {
    return new CartridgeLoader(assetManager, audioManager);
}
/**
 * Convenience function to load a cartridge from JSON
 */
async function loadCartridge(jsonString, options) {
    const loader = new CartridgeLoader();
    return loader.loadFromJSON(jsonString, options);
}

/**
 * Accessibility Manager for the LLM Canvas Engine
 * Handles keyboard navigation, screen reader support, and accessibility features
 */
/**
 * Manages accessibility features including keyboard navigation,
 * screen reader support, and visual accessibility enhancements
 */
class AccessibilityManager {
    constructor(options = {}) {
        this.canvas = null;
        this.inputManager = null;
        this.ariaLiveRegion = null;
        this.focusIndicator = null;
        this.originalTheme = null;
        this.highContrastTheme = null;
        this.options = {
            enableKeyboardNavigation: true,
            enableScreenReader: true,
            enableHighContrast: false,
            textScaling: 1.0,
            enableFocusIndicators: true,
            announceStateChanges: true,
            ...options
        };
        this.state = {
            currentFocus: null,
            focusableElements: [],
            isHighContrast: this.options.enableHighContrast,
            textScaling: this.options.textScaling,
            screenReaderEnabled: this.options.enableScreenReader
        };
        this.setupAccessibilityFeatures();
    }
    /**
     * Initialize accessibility manager with canvas and input manager
     */
    initialize(canvas, inputManager) {
        this.canvas = canvas;
        this.inputManager = inputManager;
        this.setupCanvasAccessibility();
        this.setupKeyboardNavigation();
        this.setupScreenReaderSupport();
        this.setupFocusManagement();
    }
    /**
     * Update accessibility state and handle focus management
     */
    update(sceneNodes) {
        if (!this.options.enableKeyboardNavigation)
            return;
        // Update focusable elements from scene
        this.updateFocusableElements(sceneNodes);
        // Handle keyboard navigation
        this.handleKeyboardNavigation();
        // Update focus indicators
        this.updateFocusIndicators();
    }
    /**
     * Set theme and create high contrast variant
     */
    setTheme(theme) {
        this.originalTheme = theme;
        this.highContrastTheme = this.createHighContrastTheme(theme);
        if (this.state.isHighContrast) {
            this.applyHighContrastTheme();
        }
    }
    /**
     * Toggle high contrast mode
     */
    toggleHighContrast() {
        this.state.isHighContrast = !this.state.isHighContrast;
        if (this.state.isHighContrast) {
            this.announceToScreenReader('High contrast mode enabled');
            return this.applyHighContrastTheme();
        }
        else {
            this.announceToScreenReader('High contrast mode disabled');
            return this.originalTheme || this.createDefaultTheme();
        }
    }
    /**
     * Set text scaling factor
     */
    setTextScaling(scale) {
        this.state.textScaling = Math.max(0.5, Math.min(3.0, scale));
        this.announceToScreenReader(`Text scaling set to ${Math.round(this.state.textScaling * 100)}%`);
    }
    /**
     * Get current text scaling factor
     */
    getTextScaling() {
        return this.state.textScaling;
    }
    /**
     * Focus on a specific node
     */
    focusNode(nodeId) {
        const focusable = this.state.focusableElements.find(el => el.node.id === nodeId);
        if (focusable) {
            this.setFocus(focusable);
            return true;
        }
        return false;
    }
    /**
     * Get currently focused node
     */
    getCurrentFocus() {
        return this.state.currentFocus?.node || null;
    }
    /**
     * Announce message to screen reader
     */
    announceToScreenReader(message, priority = 'polite') {
        if (!this.state.screenReaderEnabled || !this.ariaLiveRegion)
            return;
        this.ariaLiveRegion.setAttribute('aria-live', priority);
        this.ariaLiveRegion.textContent = message;
        // Clear after announcement
        setTimeout(() => {
            if (this.ariaLiveRegion) {
                this.ariaLiveRegion.textContent = '';
            }
        }, 1000);
    }
    /**
     * Get accessibility state for debugging
     */
    getAccessibilityState() {
        return { ...this.state };
    }
    /**
     * Cleanup accessibility features
     */
    cleanup() {
        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;
        }
        if (this.focusIndicator) {
            this.focusIndicator.remove();
            this.focusIndicator = null;
        }
        this.state.focusableElements = [];
        this.state.currentFocus = null;
    }
    setupAccessibilityFeatures() {
        // Detect if user prefers reduced motion
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Detect if user prefers high contrast
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (prefersHighContrast) {
            this.options.enableHighContrast = true;
            this.state.isHighContrast = true;
        }
        // Listen for system accessibility changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            if (e.matches && !this.state.isHighContrast) {
                this.state.isHighContrast = true;
                this.applyHighContrastTheme();
            }
        });
    }
    setupCanvasAccessibility() {
        if (!this.canvas)
            return;
        // Make canvas accessible
        this.canvas.setAttribute('role', 'application');
        this.canvas.setAttribute('aria-label', 'Game Canvas');
        this.canvas.setAttribute('tabindex', '0');
        // Add canvas description
        const canvasDescription = document.createElement('div');
        canvasDescription.id = 'canvas-description';
        canvasDescription.style.position = 'absolute';
        canvasDescription.style.left = '-10000px';
        canvasDescription.textContent = 'Interactive game canvas. Use arrow keys to navigate, Enter to interact, and Tab to cycle through interactive elements.';
        document.body.appendChild(canvasDescription);
        this.canvas.setAttribute('aria-describedby', 'canvas-description');
    }
    setupKeyboardNavigation() {
        if (!this.inputManager || !this.options.enableKeyboardNavigation)
            return;
        // Map accessibility keys
        this.inputManager.mapKey('tab', 'focus_next');
        this.inputManager.mapKey('shift+tab', 'focus_previous');
        this.inputManager.mapKey('enter', 'activate');
        this.inputManager.mapKey('space', 'activate');
        this.inputManager.mapKey('escape', 'cancel');
        this.inputManager.mapKey('home', 'focus_first');
        this.inputManager.mapKey('end', 'focus_last');
        this.inputManager.mapKey('up', 'navigate_up');
        this.inputManager.mapKey('down', 'navigate_down');
        this.inputManager.mapKey('left', 'navigate_left');
        this.inputManager.mapKey('right', 'navigate_right');
    }
    setupScreenReaderSupport() {
        if (!this.options.enableScreenReader)
            return;
        // Create ARIA live region for announcements
        this.ariaLiveRegion = document.createElement('div');
        this.ariaLiveRegion.setAttribute('aria-live', 'polite');
        this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
        this.ariaLiveRegion.style.position = 'absolute';
        this.ariaLiveRegion.style.left = '-10000px';
        this.ariaLiveRegion.style.width = '1px';
        this.ariaLiveRegion.style.height = '1px';
        this.ariaLiveRegion.style.overflow = 'hidden';
        document.body.appendChild(this.ariaLiveRegion);
    }
    setupFocusManagement() {
        if (!this.options.enableFocusIndicators)
            return;
        // Create focus indicator element
        this.focusIndicator = document.createElement('div');
        this.focusIndicator.style.position = 'absolute';
        this.focusIndicator.style.border = '2px solid #007acc';
        this.focusIndicator.style.borderRadius = '4px';
        this.focusIndicator.style.pointerEvents = 'none';
        this.focusIndicator.style.zIndex = '1000';
        this.focusIndicator.style.display = 'none';
        this.focusIndicator.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.focusIndicator);
    }
    updateFocusableElements(nodes) {
        this.state.focusableElements = [];
        this.collectFocusableElements(nodes, 0);
        // Sort by tab index and position
        this.state.focusableElements.sort((a, b) => {
            if (a.tabIndex !== b.tabIndex) {
                return a.tabIndex - b.tabIndex;
            }
            // Sort by position for spatial navigation
            const aPos = a.node.getWorldTransform().position;
            const bPos = b.node.getWorldTransform().position;
            return aPos.y - bPos.y || aPos.x - bPos.x;
        });
    }
    collectFocusableElements(nodes, tabIndex) {
        for (const node of nodes) {
            if (this.isFocusable(node)) {
                const element = this.createVirtualElement(node);
                this.state.focusableElements.push({
                    node,
                    element,
                    tabIndex,
                    ariaLabel: this.getAriaLabel(node),
                    ariaRole: this.getAriaRole(node)
                });
                tabIndex++;
            }
            if (node.children) {
                this.collectFocusableElements(node.children, tabIndex);
            }
        }
    }
    isFocusable(node) {
        const isWorldVisible = typeof node.isWorldVisible === 'function'
            ? node.isWorldVisible()
            : node.visible; // Fallback for plain objects
        return node.visible &&
            isWorldVisible &&
            (node.type === 'Button' ||
                node.type === 'Text' && node.interactive ||
                node.focusable === true);
    }
    createVirtualElement(node) {
        const element = document.createElement('div');
        element.setAttribute('role', this.getAriaRole(node));
        element.setAttribute('aria-label', this.getAriaLabel(node));
        element.style.position = 'absolute';
        element.style.left = '-10000px';
        return element;
    }
    getAriaLabel(node) {
        const nodeData = node;
        return nodeData.ariaLabel ||
            nodeData.text ||
            nodeData.label ||
            `${node.type} ${node.id}`;
    }
    getAriaRole(node) {
        switch (node.type) {
            case 'Button': return 'button';
            case 'Text': return 'text';
            default: return 'generic';
        }
    }
    handleKeyboardNavigation() {
        if (!this.inputManager)
            return;
        if (this.inputManager.isActionJustPressed('focus_next')) {
            this.focusNext();
        }
        else if (this.inputManager.isActionJustPressed('focus_previous')) {
            this.focusPrevious();
        }
        else if (this.inputManager.isActionJustPressed('focus_first')) {
            this.focusFirst();
        }
        else if (this.inputManager.isActionJustPressed('focus_last')) {
            this.focusLast();
        }
        else if (this.inputManager.isActionJustPressed('activate')) {
            this.activateCurrentFocus();
        }
        else if (this.inputManager.isActionJustPressed('cancel')) {
            this.clearFocus();
        }
        // Spatial navigation
        if (this.inputManager.isActionJustPressed('navigate_up')) {
            this.navigateDirection('up');
        }
        else if (this.inputManager.isActionJustPressed('navigate_down')) {
            this.navigateDirection('down');
        }
        else if (this.inputManager.isActionJustPressed('navigate_left')) {
            this.navigateDirection('left');
        }
        else if (this.inputManager.isActionJustPressed('navigate_right')) {
            this.navigateDirection('right');
        }
    }
    focusNext() {
        if (this.state.focusableElements.length === 0)
            return;
        const currentIndex = this.getCurrentFocusIndex();
        const nextIndex = (currentIndex + 1) % this.state.focusableElements.length;
        this.setFocus(this.state.focusableElements[nextIndex]);
    }
    focusPrevious() {
        if (this.state.focusableElements.length === 0)
            return;
        const currentIndex = this.getCurrentFocusIndex();
        const prevIndex = currentIndex === 0 ?
            this.state.focusableElements.length - 1 :
            currentIndex - 1;
        this.setFocus(this.state.focusableElements[prevIndex]);
    }
    focusFirst() {
        if (this.state.focusableElements.length > 0) {
            this.setFocus(this.state.focusableElements[0]);
        }
    }
    focusLast() {
        if (this.state.focusableElements.length > 0) {
            this.setFocus(this.state.focusableElements[this.state.focusableElements.length - 1]);
        }
    }
    navigateDirection(direction) {
        if (!this.state.currentFocus) {
            this.focusFirst();
            return;
        }
        const currentPos = this.state.currentFocus.node.getWorldTransform().position;
        let bestCandidate = null;
        let bestDistance = Infinity;
        for (const element of this.state.focusableElements) {
            if (element === this.state.currentFocus)
                continue;
            const pos = element.node.getWorldTransform().position;
            const dx = pos.x - currentPos.x;
            const dy = pos.y - currentPos.y;
            // Check if element is in the correct direction
            let isInDirection = false;
            switch (direction) {
                case 'up':
                    isInDirection = dy < -10;
                    break;
                case 'down':
                    isInDirection = dy > 10;
                    break;
                case 'left':
                    isInDirection = dx < -10;
                    break;
                case 'right':
                    isInDirection = dx > 10;
                    break;
            }
            if (isInDirection) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestCandidate = element;
                }
            }
        }
        if (bestCandidate) {
            this.setFocus(bestCandidate);
        }
    }
    getCurrentFocusIndex() {
        if (!this.state.currentFocus)
            return -1;
        return this.state.focusableElements.indexOf(this.state.currentFocus);
    }
    setFocus(element) {
        this.state.currentFocus = element;
        // Announce focus change to screen reader
        if (this.options.announceStateChanges && element) {
            this.announceToScreenReader(`Focused on ${element.ariaLabel}`);
        }
        // Update visual focus indicator
        this.updateFocusIndicators();
    }
    clearFocus() {
        this.state.currentFocus = null;
        this.updateFocusIndicators();
    }
    activateCurrentFocus() {
        if (!this.state.currentFocus)
            return;
        const node = this.state.currentFocus.node;
        // Trigger node activation (simulate click/tap)
        if (node.type === 'Button') {
            this.announceToScreenReader(`Activated ${this.state.currentFocus.ariaLabel}`);
            // TODO: Trigger button action
        }
    }
    updateFocusIndicators() {
        if (!this.focusIndicator || !this.canvas)
            return;
        if (!this.state.currentFocus) {
            this.focusIndicator.style.display = 'none';
            return;
        }
        // Calculate focus indicator position
        const node = this.state.currentFocus.node;
        const transform = typeof node.getWorldTransform === 'function'
            ? node.getWorldTransform()
            : node.transform; // Fallback to local transform for plain objects
        const canvasRect = this.canvas.getBoundingClientRect();
        // Convert world position to screen position
        // This is simplified - in a full implementation, this would use the renderer's coordinate conversion
        const screenX = canvasRect.left + transform.position.x;
        const screenY = canvasRect.top + transform.position.y;
        // Position and show focus indicator
        this.focusIndicator.style.left = `${screenX - 25}px`;
        this.focusIndicator.style.top = `${screenY - 25}px`;
        this.focusIndicator.style.width = '50px';
        this.focusIndicator.style.height = '50px';
        this.focusIndicator.style.display = 'block';
    }
    createHighContrastTheme(originalTheme) {
        return {
            colors: {
                primary: '#ffffff',
                secondary: '#000000',
                background: '#000000',
                text: '#ffffff',
                accent: '#ffff00'
            },
            font: {
                ...originalTheme.font,
                sizes: Object.fromEntries(Object.entries(originalTheme.font.sizes).map(([key, size]) => [
                    key,
                    Math.round(size * this.state.textScaling)
                ]))
            },
            spacing: originalTheme.spacing,
            radii: originalTheme.radii
        };
    }
    applyHighContrastTheme() {
        // Always recreate to apply current text scaling
        this.highContrastTheme = this.createHighContrastTheme(this.originalTheme || this.createDefaultTheme());
        return this.highContrastTheme;
    }
    createDefaultTheme() {
        return {
            colors: {
                primary: '#007acc',
                secondary: '#666666',
                background: '#ffffff',
                text: '#000000',
                accent: '#ff6600'
            },
            font: {
                family: 'Arial, sans-serif',
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
}

/**
 * Core LLMRTEngine implementation
 */
class LLMRTEngineImpl {
    constructor(accessibilityOptions) {
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
        this.accessibilityManager = new AccessibilityManager(accessibilityOptions);
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
    /**
     * Get accessibility manager instance
     */
    getAccessibilityManager() {
        return this.accessibilityManager;
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
 * Scene tree system for hierarchical node management
 */
/**
 * Base Node implementation with transform, visibility, and hierarchy support
 */
class NodeImpl {
    constructor(id, type) {
        this.parent = null;
        this.id = id;
        this.type = type;
        this.transform = {
            position: { x: 0, y: 0 },
            scale: { x: 1, y: 1 },
            rotation: 0,
            skew: { x: 0, y: 0 },
            alpha: 1
        };
        this.visible = true;
        this.children = [];
        this.actions = [];
        this.triggers = [];
    }
    /**
     * Add a child node to this node
     */
    addChild(child) {
        if (child === this) {
            throw new Error('Cannot add node as child of itself');
        }
        // Check for circular reference
        if (this.isDescendantOf(child)) {
            throw new Error('Cannot add ancestor as child (circular reference)');
        }
        // Remove from previous parent if any
        if (child.parent) {
            child.parent.removeChild(child);
        }
        this.children.push(child);
        child.parent = this;
    }
    /**
     * Remove a child node from this node
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index === -1) {
            return false;
        }
        this.children.splice(index, 1);
        child.parent = null;
        return true;
    }
    /**
     * Remove this node from its parent
     */
    removeFromParent() {
        if (!this.parent) {
            return false;
        }
        return this.parent.removeChild(this);
    }
    /**
     * Check if this node is a descendant of the given node
     */
    isDescendantOf(node) {
        let current = this.parent;
        while (current) {
            if (current === node) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }
    /**
     * Get the root node of the tree
     */
    getRoot() {
        let current = this;
        while (current.parent) {
            current = current.parent;
        }
        return current;
    }
    /**
     * Get the depth of this node in the tree (root = 0)
     */
    getDepth() {
        let depth = 0;
        let current = this.parent;
        while (current) {
            depth++;
            current = current.parent;
        }
        return depth;
    }
    /**
     * Get world transform by combining with parent transforms
     */
    getWorldTransform() {
        if (!this.parent) {
            return { ...this.transform };
        }
        const parentWorld = this.parent.getWorldTransform();
        // Combine transforms (simplified - in a real engine this would use matrices)
        return {
            position: {
                x: parentWorld.position.x + this.transform.position.x * parentWorld.scale.x,
                y: parentWorld.position.y + this.transform.position.y * parentWorld.scale.y
            },
            scale: {
                x: parentWorld.scale.x * this.transform.scale.x,
                y: parentWorld.scale.y * this.transform.scale.y
            },
            rotation: parentWorld.rotation + this.transform.rotation,
            skew: {
                x: parentWorld.skew.x + this.transform.skew.x,
                y: parentWorld.skew.y + this.transform.skew.y
            },
            alpha: parentWorld.alpha * this.transform.alpha
        };
    }
    /**
     * Check if this node is visible in the world (considering parent visibility)
     */
    isWorldVisible() {
        if (!this.visible) {
            return false;
        }
        let current = this.parent;
        while (current) {
            if (!current.visible) {
                return false;
            }
            current = current.parent;
        }
        return true;
    }
}
/**
 * Scene tree manager for node operations
 */
class SceneTree {
    constructor(root) {
        this.nodeMap = new Map();
        this.root = root;
        this.buildNodeMap(root);
    }
    /**
     * Get the root node of the scene
     */
    getRoot() {
        return this.root;
    }
    /**
     * Add a node to the scene tree under the specified parent
     */
    addNode(node, parentId) {
        const parent = parentId ? this.findNode(parentId) : this.root;
        if (!parent) {
            throw new Error(`Parent node with id '${parentId}' not found`);
        }
        // Check for duplicate IDs
        if (this.nodeMap.has(node.id)) {
            throw new Error(`Node with id '${node.id}' already exists in scene`);
        }
        parent.addChild(node);
        this.addToNodeMap(node);
    }
    /**
     * Remove a node from the scene tree
     */
    removeNode(nodeId) {
        const node = this.findNode(nodeId);
        if (!node) {
            return false;
        }
        // Remove from parent
        const removed = node.removeFromParent();
        if (removed) {
            this.removeFromNodeMap(node);
        }
        return removed;
    }
    /**
     * Find a node by its ID
     */
    findNode(nodeId) {
        return this.nodeMap.get(nodeId) || null;
    }
    /**
     * Find nodes by type
     */
    findNodesByType(nodeType) {
        const results = [];
        this.traverseNodes(this.root, (node) => {
            if (node.type === nodeType) {
                results.push(node);
            }
        });
        return results;
    }
    /**
     * Get all nodes in the scene
     */
    getAllNodes() {
        return Array.from(this.nodeMap.values());
    }
    /**
     * Traverse all nodes in the tree with a callback
     */
    traverseNodes(startNode, callback) {
        callback(startNode);
        for (const child of startNode.children) {
            this.traverseNodes(child, callback);
        }
    }
    /**
     * Get visible nodes for rendering (depth-first traversal)
     */
    getVisibleNodes() {
        const visibleNodes = [];
        this.collectVisibleNodes(this.root, visibleNodes);
        return visibleNodes;
    }
    collectVisibleNodes(node, result) {
        if (node.visible) {
            result.push(node);
            for (const child of node.children) {
                this.collectVisibleNodes(child, result);
            }
        }
    }
    /**
     * Build internal node map for fast lookups
     */
    buildNodeMap(node) {
        this.nodeMap.set(node.id, node);
        for (const child of node.children) {
            this.buildNodeMap(child);
        }
    }
    /**
     * Add node and its children to the node map
     */
    addToNodeMap(node) {
        this.nodeMap.set(node.id, node);
        for (const child of node.children) {
            this.addToNodeMap(child);
        }
    }
    /**
     * Remove node and its children from the node map
     */
    removeFromNodeMap(node) {
        this.nodeMap.delete(node.id);
        for (const child of node.children) {
            this.removeFromNodeMap(child);
        }
    }
}
/**
 * Factory functions for creating core node types
 */
class NodeFactory {
    /**
     * Create a Group node (container for other nodes)
     */
    static createGroup(id) {
        return new NodeImpl(id, 'Group');
    }
    /**
     * Create a Sprite node for image rendering
     */
    static createSprite(id, spriteId) {
        const node = new NodeImpl(id, 'Sprite');
        if (spriteId) {
            // Store sprite reference in a way that can be accessed by renderer
            node.spriteId = spriteId;
        }
        return node;
    }
    /**
     * Create a Text node for text rendering
     */
    static createText(id, text) {
        const node = new NodeImpl(id, 'Text');
        if (text !== undefined) {
            node.text = text;
        }
        return node;
    }
    /**
     * Create a Button node for interactive elements
     */
    static createButton(id, text) {
        const node = new NodeImpl(id, 'Button');
        if (text !== undefined) {
            node.text = text;
        }
        return node;
    }
    /**
     * Create a Camera2D node for viewport control
     */
    static createCamera2D(id) {
        const node = new NodeImpl(id, 'Camera2D');
        // Initialize camera-specific properties
        node.zoom = 1;
        node.target = { x: 0, y: 0 };
        return node;
    }
}

/**
 * Fixed-tick game loop with interpolation for the LLM Canvas Engine
 * Provides deterministic 60Hz updates with smooth rendering interpolation
 */
/**
 * Seedable pseudo-random number generator using Linear Congruential Generator
 * Provides deterministic random numbers for reproducible gameplay
 */
class DeterministicRNG {
    constructor() {
        this._seed = 1;
    }
    seed(value) {
        this._seed = Math.abs(value) || 1;
    }
    random() {
        // LCG formula: (a * seed + c) % m
        // Using values from Numerical Recipes
        this._seed = (this._seed * 1664525 + 1013904223) % 4294967296;
        return this._seed / 4294967296;
    }
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }
}
/**
 * Fixed-tick game loop with frame interpolation
 * Maintains deterministic 60Hz game logic updates while allowing smooth rendering
 */
class GameLoop {
    constructor(callbacks) {
        this.tickRate = 60; // 60 Hz fixed tick rate
        this.tickInterval = 1000 / 60; // ~16.67ms per tick
        this._running = false;
        this._paused = false;
        this._callbacks = {};
        // Timing state
        this._lastTime = 0;
        this._accumulator = 0;
        this._tickCount = 0;
        this._frameCount = 0;
        // Performance tracking
        this._frameTimeHistory = [];
        this._lastFpsUpdate = 0;
        this._currentFps = 0;
        this._droppedFrames = 0;
        // RNG system
        this._rng = new DeterministicRNG();
        // Animation frame handle
        this._rafHandle = null;
        /**
         * Main game loop step
         */
        this._gameLoopStep = () => {
            if (!this._running)
                return;
            const currentTime = performance.now();
            const frameTime = currentTime - this._lastTime;
            this._lastTime = currentTime;
            this._frameCount++;
            // Track frame time for performance metrics
            this._frameTimeHistory.push(frameTime);
            if (this._frameTimeHistory.length > 60) {
                this._frameTimeHistory.shift();
            }
            // Update FPS counter every second
            if (currentTime - this._lastFpsUpdate >= 1000) {
                this._currentFps = Math.round(1000 / (this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length));
                this._lastFpsUpdate = currentTime;
            }
            // Fixed timestep with accumulator
            if (!this._paused) {
                this._accumulator += frameTime;
                // Prevent spiral of death - if we're too far behind, drop frames
                const maxAccumulator = this.tickInterval * 5; // Allow up to 5 ticks per frame
                if (this._accumulator > maxAccumulator) {
                    const droppedTime = this._accumulator - maxAccumulator;
                    const droppedTicks = Math.floor(droppedTime / this.tickInterval);
                    this._droppedFrames += droppedTicks;
                    this._accumulator = maxAccumulator;
                }
                // Process fixed timestep updates
                while (this._accumulator >= this.tickInterval) {
                    this._tick();
                    this._accumulator -= this.tickInterval;
                    this._tickCount++;
                }
            }
            // Calculate interpolation factor for smooth rendering
            const interpolation = this._paused ? 0 : this._accumulator / this.tickInterval;
            // Render with interpolation
            this._render(interpolation, frameTime);
            // Schedule next frame
            this._rafHandle = requestAnimationFrame(this._gameLoopStep);
        };
        this._callbacks = callbacks || {};
        this._rng.seed(Date.now());
    }
    /**
     * Start the game loop
     */
    start() {
        if (this._running)
            return;
        this._running = true;
        this._paused = false;
        this._lastTime = performance.now();
        this._startTime = this._lastTime;
        this._accumulator = 0;
        this._tickCount = 0;
        this._frameCount = 0;
        this._droppedFrames = 0;
        this._frameTimeHistory = [];
        this._lastFpsUpdate = this._lastTime;
        this._gameLoopStep();
    }
    /**
     * Stop the game loop
     */
    stop() {
        this._running = false;
        this._paused = false;
        if (this._rafHandle !== null) {
            cancelAnimationFrame(this._rafHandle);
            this._rafHandle = null;
        }
    }
    /**
     * Pause the game loop (stops ticks but continues rendering)
     */
    pause() {
        this._paused = true;
    }
    /**
     * Resume the game loop
     */
    resume() {
        if (!this._running)
            return;
        this._paused = false;
        this._lastTime = performance.now();
        this._accumulator = 0; // Reset accumulator to prevent catch-up
    }
    /**
     * Set callbacks for tick and render events
     */
    setCallbacks(callbacks) {
        this._callbacks = { ...this._callbacks, ...callbacks };
    }
    /**
     * Get current performance metrics
     */
    getMetrics() {
        const averageFrameTime = this._frameTimeHistory.length > 0
            ? this._frameTimeHistory.reduce((a, b) => a + b, 0) / this._frameTimeHistory.length
            : 0;
        return {
            fps: this._currentFps,
            averageFrameTime,
            tickRate: this.tickRate,
            droppedFrames: this._droppedFrames,
            totalTicks: this._tickCount,
            totalFrames: this._frameCount
        };
    }
    /**
     * Get the deterministic RNG instance
     */
    getRNG() {
        return this._rng;
    }
    /**
     * Seed the RNG for deterministic behavior
     */
    seedRNG(seed) {
        this._rng.seed(seed);
    }
    /**
     * Get current tick count
     */
    get tickCount() {
        return this._tickCount;
    }
    /**
     * Get current frame count
     */
    get frameCount() {
        return this._frameCount;
    }
    /**
     * Check if the loop is running
     */
    get isRunning() {
        return this._running;
    }
    /**
     * Check if the loop is paused
     */
    get isPaused() {
        return this._paused;
    }
    /**
     * Execute a single game logic tick
     */
    _tick() {
        if (this._callbacks.onTick) {
            this._callbacks.onTick(this._tickCount, this.tickInterval);
        }
    }
    /**
     * Execute a render frame with interpolation
     */
    _render(interpolation, frameTime) {
        if (this._callbacks.onRender) {
            this._callbacks.onRender(interpolation, frameTime);
        }
    }
}

/**
 * Action and Trigger execution system
 */
class ActionSystem {
    constructor() {
        this.tweens = new Map();
        this.timers = new Map();
        this.nextTweenId = 0;
        this.nextTimerId = 0;
    }
    /**
     * Execute an action with the given context
     */
    async executeAction(action, context) {
        // Check conditions first
        if (action.conditions && !this.evaluateConditions(action.conditions, context)) {
            return;
        }
        switch (action.type) {
            case 'gotoScene':
                this.executeGotoScene(action, context);
                break;
            case 'spawn':
                this.executeSpawn(action, context);
                break;
            case 'despawn':
                this.executeDespawn(action, context);
                break;
            case 'setVar':
                this.executeSetVar(action, context);
                break;
            case 'incVar':
                this.executeIncVar(action, context);
                break;
            case 'randomInt':
                this.executeRandomInt(action, context);
                break;
            case 'if':
                this.executeIf(action, context);
                break;
            case 'tween':
                this.executeTween(action, context);
                break;
            case 'startTimer':
                this.executeStartTimer(action, context);
                break;
            case 'stopTimer':
                this.executeStopTimer(action, context);
                break;
            case 'playSfx':
                this.executePlaySfx(action, context);
                break;
            case 'playMusic':
                this.executePlayMusic(action, context);
                break;
            case 'stopMusic':
                this.executeStopMusic(action, context);
                break;
            default:
                console.warn(`Unsupported action type: ${action.type}`);
        }
    }
    /**
     * Update all active tweens and timers
     */
    update(deltaTime) {
        this.updateTweens(deltaTime);
        this.updateTimers(deltaTime);
    }
    /**
     * Evaluate conditions for an action
     */
    evaluateConditions(conditions, context) {
        return conditions.every(condition => this.evaluateCondition(condition, context));
    }
    /**
     * Evaluate a single condition
     */
    evaluateCondition(condition, context) {
        const variable = context.variables.get(condition.variable);
        switch (condition.type) {
            case 'equals':
                return variable === condition.value;
            case 'greater':
                return typeof variable === 'number' && variable > (condition.value || 0);
            case 'less':
                return typeof variable === 'number' && variable < (condition.value || 0);
            case 'exists':
                return variable !== undefined;
            default:
                return false;
        }
    }
    // Action implementations
    executeGotoScene(action, context) {
        const sceneId = action.params.scene;
        if (typeof sceneId === 'string') {
            // This would trigger a scene change in the engine
            context.variables.set('__nextScene', sceneId);
        }
    }
    executeSpawn(action, context) {
        const nodeData = action.params.node;
        const parentId = action.params.parent || context.node.id;
        if (nodeData && typeof nodeData === 'object') {
            // Create new node from data
            const newNode = this.createNodeFromData(nodeData);
            const parent = context.sceneNodes.get(parentId);
            if (parent && newNode) {
                parent.addChild(newNode);
                context.sceneNodes.set(newNode.id, newNode);
            }
        }
    }
    executeDespawn(action, context) {
        const nodeId = action.params.node || context.node.id;
        const node = context.sceneNodes.get(nodeId);
        if (node) {
            node.removeFromParent();
            context.sceneNodes.delete(nodeId);
        }
    }
    executeSetVar(action, context) {
        const variable = action.params.variable;
        const value = action.params.value;
        if (typeof variable === 'string') {
            context.variables.set(variable, value);
        }
    }
    executeIncVar(action, context) {
        const variable = action.params.variable;
        const amount = action.params.amount || 1;
        if (typeof variable === 'string') {
            const current = context.variables.get(variable) || 0;
            if (typeof current === 'number') {
                context.variables.set(variable, current + amount);
            }
        }
    }
    executeRandomInt(action, context) {
        const min = action.params.min || 0;
        const max = action.params.max || 100;
        const variable = action.params.variable;
        if (typeof variable === 'string') {
            const value = context.gameLoop.getRNG().randomInt(min, max);
            context.variables.set(variable, value);
        }
    }
    executeIf(action, context) {
        const condition = action.params.condition;
        const thenActions = action.params.then || [];
        const elseActions = action.params.else || [];
        if (condition && this.evaluateCondition(condition, context)) {
            // Execute then actions
            for (const thenAction of thenActions) {
                this.executeAction(thenAction, context);
            }
        }
        else {
            // Execute else actions
            for (const elseAction of elseActions) {
                this.executeAction(elseAction, context);
            }
        }
    }
    executeTween(action, context) {
        const target = action.params.target || context.node;
        const property = action.params.property;
        const to = action.params.to;
        const duration = action.params.duration || 1000; // ms
        const easing = this.getEasingFunction(action.params.easing || 'linear');
        if (!target || !property || to === undefined) {
            return;
        }
        const startValue = this.getPropertyValue(target, property);
        if (typeof startValue !== 'number' || typeof to !== 'number') {
            return;
        }
        const tweenId = `tween_${this.nextTweenId++}`;
        const tween = {
            object: target,
            property,
            startValue,
            endValue: to,
            duration,
            elapsed: 0,
            easing
        };
        this.tweens.set(tweenId, tween);
    }
    executeStartTimer(action, context) {
        const duration = action.params.duration || 1000; // ms
        const actions = action.params.actions || [];
        const timerId = action.params.id || `timer_${this.nextTimerId++}`;
        const timer = {
            id: timerId,
            duration,
            elapsed: 0,
            actions,
            context
        };
        this.timers.set(timerId, timer);
    }
    executeStopTimer(action, _context) {
        const timerId = action.params.id;
        if (typeof timerId === 'string') {
            this.timers.delete(timerId);
        }
    }
    executePlaySfx(action, context) {
        const id = action.params.id;
        const volume = action.params.volume;
        if (typeof id === 'string') {
            context.audioManager.playSfx(id, volume);
        }
    }
    executePlayMusic(action, context) {
        const id = action.params.id;
        const loop = action.params.loop;
        const volume = action.params.volume;
        if (typeof id === 'string') {
            context.audioManager.playMusic(id, loop, volume);
        }
    }
    executeStopMusic(_action, context) {
        context.audioManager.stopMusic();
    }
    // Helper methods
    createNodeFromData(_nodeData) {
        // This would create a proper Node instance from JSON data
        // For now, return null as this requires the full Node implementation
        return null;
    }
    getPropertyValue(object, property) {
        const parts = property.split('.');
        let current = object;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return undefined;
            }
        }
        return current;
    }
    setPropertyValue(object, property, value) {
        const parts = property.split('.');
        let current = object;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return;
            }
        }
        const finalPart = parts[parts.length - 1];
        if (current && typeof current === 'object') {
            current[finalPart] = value;
        }
    }
    getEasingFunction(easing) {
        switch (easing) {
            case 'linear':
                return (t) => t;
            case 'easeIn':
                return (t) => t * t;
            case 'easeOut':
                return (t) => 1 - (1 - t) * (1 - t);
            case 'easeInOut':
                return (t) => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
            default:
                return (t) => t;
        }
    }
    updateTweens(deltaTime) {
        const completedTweens = [];
        for (const [id, tween] of this.tweens) {
            tween.elapsed += deltaTime;
            const progress = Math.min(tween.elapsed / tween.duration, 1);
            const easedProgress = tween.easing(progress);
            const currentValue = tween.startValue + (tween.endValue - tween.startValue) * easedProgress;
            this.setPropertyValue(tween.object, tween.property, currentValue);
            if (progress >= 1) {
                completedTweens.push(id);
            }
        }
        // Remove completed tweens
        for (const id of completedTweens) {
            this.tweens.delete(id);
        }
    }
    updateTimers(deltaTime) {
        const completedTimers = [];
        for (const [id, timer] of this.timers) {
            timer.elapsed += deltaTime;
            if (timer.elapsed >= timer.duration) {
                // Execute timer actions
                for (const action of timer.actions) {
                    this.executeAction(action, timer.context);
                }
                completedTimers.push(id);
            }
        }
        // Remove completed timers
        for (const id of completedTimers) {
            this.timers.delete(id);
        }
    }
}

/**
 * Trigger event system
 */
class TriggerSystem {
    constructor(actionSystem) {
        this.activeNodes = new Set();
        this.keyStates = new Map();
        this.pointerStates = new Map();
        this.timers = new Map();
        this.actionSystem = actionSystem;
    }
    /**
     * Register a node for trigger processing
     */
    registerNode(node, context) {
        this.activeNodes.add(node);
        // Process on.start triggers immediately if context is provided
        if (context) {
            const startContext = { ...context, node };
            this.processTriggers(node, 'on.start', startContext);
        }
    }
    /**
     * Unregister a node from trigger processing
     */
    unregisterNode(node) {
        this.activeNodes.delete(node);
    }
    /**
     * Process tick triggers for all registered nodes
     */
    processTick(context) {
        for (const node of this.activeNodes) {
            const tickContext = { ...context, node };
            this.processTriggers(node, 'on.tick', tickContext);
        }
    }
    /**
     * Handle input events and trigger appropriate actions
     */
    handleInput(event, context) {
        if (event.type === 'key') {
            this.handleKeyEvent(event, context);
        }
        else if (event.type === 'pointer') {
            this.handlePointerEvent(event, context);
        }
    }
    /**
     * Process timer triggers
     */
    processTimers(context, deltaTime) {
        // Update timer states
        for (const [timerId, remaining] of this.timers) {
            const newRemaining = remaining - deltaTime;
            if (newRemaining <= 0) {
                // Timer expired, trigger timer events
                for (const node of this.activeNodes) {
                    const timerContext = {
                        ...context,
                        node,
                        eventData: { timerId }
                    };
                    this.processTriggers(node, 'on.timer', timerContext);
                }
                this.timers.delete(timerId);
            }
            else {
                this.timers.set(timerId, newRemaining);
            }
        }
    }
    /**
     * Start a timer that will trigger on.timer events
     */
    startTimer(id, duration) {
        this.timers.set(id, duration);
    }
    /**
     * Stop a timer
     */
    stopTimer(id) {
        this.timers.delete(id);
    }
    /**
     * Process triggers of a specific event type for a node
     */
    processTriggers(node, eventType, context) {
        if (!node.triggers || !context)
            return;
        for (const trigger of node.triggers) {
            if (trigger.event === eventType) {
                // Execute all actions for this trigger
                for (const action of trigger.actions) {
                    this.actionSystem.executeAction(action, context);
                }
            }
        }
    }
    /**
     * Handle keyboard events
     */
    handleKeyEvent(event, context) {
        if (!event.key)
            return;
        const wasPressed = this.keyStates.get(event.key) || false;
        const isPressed = event.pressed || false;
        this.keyStates.set(event.key, isPressed);
        // Only trigger on key press (not release or hold)
        if (isPressed && !wasPressed) {
            for (const node of this.activeNodes) {
                const keyContext = {
                    ...context,
                    node,
                    eventData: { key: event.key }
                };
                // Check if this node has key triggers for this specific key
                if (node.triggers) {
                    for (const trigger of node.triggers) {
                        if (trigger.event === 'on.key') {
                            // Check if trigger is for this specific key or any key
                            const triggerKey = this.getTriggerKey(trigger);
                            if (!triggerKey || triggerKey === event.key) {
                                for (const action of trigger.actions) {
                                    this.actionSystem.executeAction(action, keyContext);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    /**
     * Handle pointer/mouse events
     */
    handlePointerEvent(event, context) {
        const button = event.button || 0;
        const wasPressed = this.pointerStates.get(button) || false;
        const isPressed = event.pressed || false;
        this.pointerStates.set(button, isPressed);
        // Only trigger on pointer press (not release or hold)
        if (isPressed && !wasPressed) {
            for (const node of this.activeNodes) {
                // Check if pointer is over this node (simplified check)
                if (this.isPointerOverNode(node, event.position)) {
                    const pointerContext = {
                        ...context,
                        node,
                        eventData: {
                            button,
                            position: event.position
                        }
                    };
                    this.processTriggers(node, 'on.pointer', pointerContext);
                }
            }
        }
    }
    /**
     * Extract the key from a key trigger (if specified)
     */
    getTriggerKey() {
        // Look for key specification in trigger actions or params
        // This is a simplified implementation
        return null;
    }
    /**
     * Check if pointer position is over a node
     * This is a simplified implementation - real implementation would need
     * proper transform calculations and bounds checking
     */
    isPointerOverNode(node, position) {
        if (!position || !node.visible)
            return false;
        // Simplified bounds check - real implementation would calculate
        // world transform and proper bounds
        const nodePos = node.transform.position;
        const distance = Math.sqrt(Math.pow(position.x - nodePos.x, 2) +
            Math.pow(position.y - nodePos.y, 2));
        // Simple radius check - real implementation would use proper bounds
        return distance < 50;
    }
    /**
     * Get current key state
     */
    isKeyPressed(key) {
        return this.keyStates.get(key) || false;
    }
    /**
     * Get current pointer button state
     */
    isPointerPressed(button = 0) {
        return this.pointerStates.get(button) || false;
    }
    /**
     * Clear all input states (useful for scene transitions)
     */
    clearInputStates() {
        this.keyStates.clear();
        this.pointerStates.clear();
    }
}

/**
 * Optimized canvas rendering system for the LLM Canvas Engine
 */
/**
 * Optimized canvas renderer with performance monitoring and quality adjustment
 */
class Renderer {
    constructor(canvas, theme) {
        this.modules = new Map();
        this.nodeTypeToModule = new Map();
        this.qualitySettings = {
            renderScale: 1.0,
            particleDensity: 1.0,
            shadowQuality: 'medium',
            textureFiltering: true,
            postProcessing: true,
            audioQuality: 'high',
            maxActiveAudioSources: 8
        };
        this.renderStats = {
            drawCalls: 0,
            triangles: 0,
            sprites: 0,
            renderTime: 0,
            culledNodes: 0,
            batchedSprites: 0
        };
        this.spriteBatch = [];
        this.enableFrustumCulling = true;
        this.enableSpriteBatching = true;
        this.canvas = canvas;
        const ctx = canvas.getContext('2d', {
            alpha: false, // Opaque canvas for better performance
            desynchronized: true, // Allow async rendering
            willReadFrequently: false // Optimize for write-only
        });
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context');
        }
        this.ctx = ctx;
        this.theme = theme;
        // Initialize camera
        this.camera = {
            position: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            target: { x: 0, y: 0 }
        };
        // Initialize viewport
        this.viewport = {
            width: canvas.width,
            height: canvas.height,
            scale: 1,
            offset: { x: 0, y: 0 }
        };
        // Setup optimization features
        this.setupOffscreenCanvas();
        this.optimizeCanvasSettings();
        this.detectPlatformOptimizations();
        // Register core node type renderers
        this.registerCoreRenderers();
        // Load any registered render modules from the module registry
        this.loadRegisteredModules();
        // Set up responsive canvas
        this.setupResponsiveCanvas();
    }
    /**
     * Main render method - renders scene tree with interpolation and optimizations
     */
    render(sceneTree, interpolation) {
        const startTime = performance.now();
        // Reset render stats
        this.renderStats = {
            drawCalls: 0,
            triangles: 0,
            sprites: 0,
            renderTime: 0,
            culledNodes: 0,
            batchedSprites: 0
        };
        // Choose rendering context based on quality settings
        const renderCtx = this.qualitySettings.renderScale < 1.0 && this.offscreenCtx
            ? this.offscreenCtx
            : this.ctx;
        const renderCanvas = this.qualitySettings.renderScale < 1.0 && this.offscreenCanvas
            ? this.offscreenCanvas
            : this.canvas;
        // Clear canvas
        renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
        this.renderStats.drawCalls++;
        // Fill background
        renderCtx.fillStyle = this.theme.colors.background;
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
        this.renderStats.drawCalls++;
        // Set up camera transform
        this.setupCameraTransform(interpolation, renderCtx);
        // Create render context
        const context = {
            canvas: renderCanvas,
            ctx: renderCtx,
            camera: this.camera,
            theme: this.theme,
            interpolation,
            viewport: this.viewport
        };
        // Cull and batch nodes for optimized rendering
        const visibleNodes = this.cullNodes(sceneTree);
        // Render with batching optimizations
        this.renderOptimized(visibleNodes, context);
        // Copy from offscreen canvas if using scaled rendering
        if (renderCtx !== this.ctx && this.offscreenCanvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height, 0, 0, this.canvas.width, this.canvas.height);
            this.renderStats.drawCalls++;
        }
        // Reset transform
        renderCtx.restore();
        // Update render stats
        this.renderStats.renderTime = performance.now() - startTime;
        // Report to performance monitor
        if (this.performanceMonitor) {
            this.performanceMonitor.updateMetrics(this.renderStats.renderTime, this.getMemoryUsage(), this.renderStats.sprites, this.renderStats.drawCalls);
        }
    }
    /**
     * Register a render module for custom node types
     */
    registerModule(module) {
        this.modules.set(module.name, module);
        // Map node types to this module
        for (const nodeType of module.nodeTypes) {
            this.nodeTypeToModule.set(nodeType, module);
        }
        // Also register with the module registry
        ModuleRegistry.getInstance().registerRenderModule(module);
    }
    /**
     * Update theme tokens
     */
    setTheme(theme) {
        this.theme = theme;
        // Update accessibility manager with new theme
        if (this.accessibilityManager) {
            this.accessibilityManager.setTheme(theme);
        }
    }
    /**
     * Update camera properties
     */
    setCamera(camera) {
        Object.assign(this.camera, camera);
    }
    /**
     * Get current viewport information
     */
    getViewport() {
        return { ...this.viewport };
    }
    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenPos) {
        const worldX = (screenPos.x - this.viewport.offset.x) / this.camera.zoom + this.camera.position.x;
        const worldY = (screenPos.y - this.viewport.offset.y) / this.camera.zoom + this.camera.position.y;
        return { x: worldX, y: worldY };
    }
    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldPos) {
        const screenX = (worldPos.x - this.camera.position.x) * this.camera.zoom + this.viewport.offset.x;
        const screenY = (worldPos.y - this.camera.position.y) * this.camera.zoom + this.viewport.offset.y;
        return { x: screenX, y: screenY };
    }
    setupCameraTransform() {
        this.ctx.save();
        // Apply viewport scaling and centering
        this.ctx.translate(this.viewport.offset.x, this.viewport.offset.y);
        this.ctx.scale(this.viewport.scale, this.viewport.scale);
        // Apply camera transform
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.rotate(this.camera.rotation);
        this.ctx.translate(-this.camera.position.x, -this.camera.position.y);
    }
    renderNode(node, context) {
        // Get interpolated world transform
        const worldTransform = this.getInterpolatedWorldTransform(node);
        // Skip if completely transparent
        if (worldTransform.alpha <= 0) {
            return;
        }
        // Save context state
        context.ctx.save();
        // Apply node transform
        this.applyTransform(context.ctx, worldTransform);
        // Render based on node type
        const module = this.nodeTypeToModule.get(node.type);
        if (module) {
            module.render(node, context);
        }
        else {
            console.warn(`No renderer found for node type: ${node.type}`);
        }
        // Render children
        for (const child of node.children) {
            if (child.visible) {
                this.renderNode(child, context);
            }
        }
        // Restore context state
        context.ctx.restore();
    }
    getInterpolatedWorldTransform(node) {
        // For now, return current world transform
        // In a full implementation, this would interpolate between previous and current transforms
        return node.getWorldTransform();
    }
    applyTransform(ctx, transform) {
        ctx.translate(transform.position.x, transform.position.y);
        ctx.rotate(transform.rotation);
        ctx.scale(transform.scale.x, transform.scale.y);
        // Apply skew if present
        if (transform.skew.x !== 0 || transform.skew.y !== 0) {
            ctx.transform(1, Math.tan(transform.skew.y), Math.tan(transform.skew.x), 1, 0, 0);
        }
        ctx.globalAlpha *= transform.alpha;
    }
    registerCoreRenderers() {
        // Register core node type renderers
        const coreRenderer = {
            name: 'core',
            nodeTypes: ['Group', 'Sprite', 'Text', 'Button', 'Camera2D'],
            render: (node, context) => {
                this.renderCoreNode(node, context);
            }
        };
        this.registerModule(coreRenderer);
    }
    renderCoreNode(node, context) {
        switch (node.type) {
            case 'Group':
                // Groups don't render anything themselves, just their children
                break;
            case 'Sprite':
                this.renderSprite(node, context);
                break;
            case 'Text':
                this.renderText(node, context);
                break;
            case 'Button':
                this.renderButton(node, context);
                break;
            case 'Camera2D':
                // Camera nodes don't render visually
                break;
            default:
                console.warn(`Core renderer doesn't handle node type: ${node.type}`);
        }
    }
    renderSprite(node, context) {
        const spriteId = node.spriteId;
        if (!spriteId) {
            // Render placeholder rectangle
            context.ctx.fillStyle = context.theme.colors.primary;
            context.ctx.fillRect(-25, -25, 50, 50);
            return;
        }
        // TODO: Load and render actual sprite image
        // For now, render a colored rectangle as placeholder
        context.ctx.fillStyle = context.theme.colors.primary;
        context.ctx.fillRect(-25, -25, 50, 50);
    }
    renderText(node, context) {
        const text = node.text || 'Text';
        let fontSize = node.fontSize || context.theme.font.sizes.medium || 16;
        // Apply accessibility text scaling
        if (this.accessibilityManager) {
            fontSize = Math.round(fontSize * this.accessibilityManager.getTextScaling());
        }
        context.ctx.font = `${fontSize}px ${context.theme.font.family}`;
        context.ctx.fillStyle = context.theme.colors.text;
        context.ctx.textAlign = 'center';
        context.ctx.textBaseline = 'middle';
        context.ctx.fillText(text, 0, 0);
    }
    renderButton(node, context) {
        const text = node.text || 'Button';
        let fontSize = node.fontSize || context.theme.font.sizes.medium || 16;
        const padding = context.theme.spacing.medium || 8;
        // Apply accessibility text scaling
        if (this.accessibilityManager) {
            fontSize = Math.round(fontSize * this.accessibilityManager.getTextScaling());
        }
        // Check if this button is currently focused
        const isFocused = this.accessibilityManager?.getCurrentFocus()?.id === node.id;
        // Measure text
        context.ctx.font = `${fontSize}px ${context.theme.font.family}`;
        const textMetrics = context.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;
        // Calculate button dimensions (ensure minimum 44px for accessibility)
        const minSize = 44;
        const buttonWidth = Math.max(textWidth + padding * 2, minSize);
        const buttonHeight = Math.max(textHeight + padding * 2, minSize);
        // Draw button background
        context.ctx.fillStyle = isFocused ? context.theme.colors.accent : context.theme.colors.secondary;
        const radius = context.theme.radii.small || 4;
        this.drawRoundedRect(context.ctx, -buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, radius);
        // Draw focus indicator if focused
        if (isFocused) {
            context.ctx.strokeStyle = context.theme.colors.primary;
            context.ctx.lineWidth = 2;
            context.ctx.setLineDash([4, 2]);
            this.strokeRoundedRect(context.ctx, -buttonWidth / 2 - 2, -buttonHeight / 2 - 2, buttonWidth + 4, buttonHeight + 4, radius + 2);
            context.ctx.setLineDash([]);
        }
        // Draw button text
        context.ctx.fillStyle = context.theme.colors.text;
        context.ctx.textAlign = 'center';
        context.ctx.textBaseline = 'middle';
        context.ctx.fillText(text, 0, 0);
    }
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    strokeRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
    }
    loadRegisteredModules() {
        const moduleRegistry = ModuleRegistry.getInstance();
        const registeredModules = moduleRegistry.getRegisteredModules();
        for (const moduleDefinition of registeredModules) {
            const renderModule = moduleRegistry.getRenderModule(moduleDefinition.name);
            if (renderModule) {
                this.modules.set(renderModule.name, renderModule);
                // Map node types to this module
                for (const nodeType of renderModule.nodeTypes) {
                    this.nodeTypeToModule.set(nodeType, renderModule);
                }
            }
        }
    }
    setupResponsiveCanvas() {
        const updateViewport = () => {
            const container = this.canvas.parentElement;
            if (!container)
                return;
            const containerRect = container.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
            // Calculate scale to fit container while maintaining aspect ratio
            const canvasAspect = this.canvas.width / this.canvas.height;
            const containerAspect = containerRect.width / containerRect.height;
            let scale;
            if (canvasAspect > containerAspect) {
                // Canvas is wider - fit to width
                scale = containerRect.width / this.canvas.width;
            }
            else {
                // Canvas is taller - fit to height
                scale = containerRect.height / this.canvas.height;
            }
            // Update viewport
            this.viewport = {
                width: this.canvas.width,
                height: this.canvas.height,
                scale: scale * devicePixelRatio,
                offset: {
                    x: (containerRect.width - this.canvas.width * scale) / 2,
                    y: (containerRect.height - this.canvas.height * scale) / 2
                }
            };
            // Update canvas display size
            this.canvas.style.width = `${this.canvas.width * scale}px`;
            this.canvas.style.height = `${this.canvas.height * scale}px`;
        };
        // Update on resize
        window.addEventListener('resize', updateViewport);
        updateViewport();
    }
    // Performance optimization methods
    setupOffscreenCanvas() {
        try {
            this.offscreenCanvas = document.createElement('canvas');
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
            this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
                alpha: false,
                desynchronized: true,
                willReadFrequently: false
            });
        }
        catch (error) {
            console.warn('Offscreen canvas not available:', error);
        }
    }
    optimizeCanvasSettings() {
        // Disable image smoothing for pixel-perfect rendering when needed
        this.ctx.imageSmoothingEnabled = this.qualitySettings.textureFiltering;
        if (this.offscreenCtx) {
            this.offscreenCtx.imageSmoothingEnabled = this.qualitySettings.textureFiltering;
        }
        // Set optimal composite operation
        this.ctx.globalCompositeOperation = 'source-over';
    }
    detectPlatformOptimizations() {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLowEnd = this.detectLowEndDevice();
        if (isMobile || isLowEnd) {
            this.qualitySettings.renderScale = 0.8;
            this.qualitySettings.particleDensity = 0.7;
            this.qualitySettings.textureFiltering = false;
            this.qualitySettings.postProcessing = false;
            this.maxBatchSize = 50;
            this.enableFrustumCulling = true;
            this.enableSpriteBatching = true;
        }
    }
    detectLowEndDevice() {
        const memory = navigator.deviceMemory;
        const cores = navigator.hardwareConcurrency;
        if (memory && memory < 4)
            return true; // Less than 4GB RAM
        if (cores && cores < 4)
            return true; // Less than 4 CPU cores
        return false;
    }
    cullNodes(nodes) {
        if (!this.enableFrustumCulling) {
            return nodes.filter(node => node.visible && node.isWorldVisible());
        }
        const visibleNodes = [];
        const frustum = this.calculateFrustum();
        for (const node of nodes) {
            if (node.visible && node.isWorldVisible()) {
                if (this.isNodeInFrustum(node, frustum)) {
                    visibleNodes.push(node);
                }
                else {
                    this.renderStats.culledNodes++;
                }
            }
        }
        return visibleNodes;
    }
    calculateFrustum() {
        const halfWidth = this.canvas.width / (2 * this.camera.zoom);
        const halfHeight = this.canvas.height / (2 * this.camera.zoom);
        return {
            left: this.camera.position.x - halfWidth,
            right: this.camera.position.x + halfWidth,
            top: this.camera.position.y - halfHeight,
            bottom: this.camera.position.y + halfHeight
        };
    }
    isNodeInFrustum(node, frustum) {
        const worldTransform = node.getWorldTransform();
        const bounds = this.getNodeBounds(node, worldTransform);
        return !(bounds.right < frustum.left ||
            bounds.left > frustum.right ||
            bounds.bottom < frustum.top ||
            bounds.top > frustum.bottom);
    }
    getNodeBounds(node, transform) {
        // Simplified bounds calculation - in a full implementation this would be more sophisticated
        const size = 50; // Default node size
        const halfSize = size / 2;
        return {
            left: transform.position.x - halfSize,
            right: transform.position.x + halfSize,
            top: transform.position.y - halfSize,
            bottom: transform.position.y + halfSize
        };
    }
    renderOptimized(nodes, context) {
        if (this.enableSpriteBatching) {
            this.renderWithBatching(nodes, context);
        }
        else {
            // Fallback to regular rendering
            for (const node of nodes) {
                this.renderNode(node, context);
            }
        }
    }
    renderWithBatching(nodes, context) {
        // Collect sprites for batching
        this.spriteBatch = [];
        const nonBatchableNodes = [];
        for (const node of nodes) {
            if (node.type === 'Sprite' && this.canBatchSprite(node)) {
                this.spriteBatch.push(node);
            }
            else {
                nonBatchableNodes.push(node);
            }
        }
        // Render batched sprites
        if (this.spriteBatch.length > 0) {
            this.renderSpriteBatch(context);
        }
        // Render non-batchable nodes
        for (const node of nonBatchableNodes) {
            this.renderNode(node, context);
        }
    }
    canBatchSprite(node) {
        const transform = node.getWorldTransform();
        // Only batch sprites with simple transforms
        return (transform.rotation === 0 &&
            transform.skew.x === 0 &&
            transform.skew.y === 0 &&
            transform.alpha === 1);
    }
    renderSpriteBatch(context) {
        if (this.spriteBatch.length === 0)
            return;
        context.ctx.save();
        // Sort sprites by texture/color for better batching
        this.spriteBatch.sort((a, b) => {
            const aSprite = a;
            const bSprite = b;
            return (aSprite.texture || aSprite.color || '').localeCompare(bSprite.texture || bSprite.color || '');
        });
        // Render all sprites in batch
        let currentTexture = '';
        for (const node of this.spriteBatch) {
            const sprite = node;
            const transform = node.getWorldTransform();
            // Change fill style only when texture/color changes
            const texture = sprite.texture || sprite.color || context.theme.colors.primary;
            if (texture !== currentTexture) {
                context.ctx.fillStyle = texture;
                currentTexture = texture;
            }
            // Render sprite
            const size = 50; // Default sprite size
            context.ctx.fillRect(transform.position.x - size / 2, transform.position.y - size / 2, size * transform.scale.x, size * transform.scale.y);
            this.renderStats.sprites++;
            this.renderStats.batchedSprites++;
        }
        context.ctx.restore();
        this.renderStats.drawCalls++;
    }
    getMemoryUsage() {
        if (this.memoryManager) {
            return this.memoryManager.getCurrentMemoryUsage() / 1024 / 1024; // Convert to MB
        }
        if ('memory' in performance) {
            return performance.memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
    }
    // Public optimization methods
    setPerformanceMonitor(monitor) {
        this.performanceMonitor = monitor;
        // Listen for quality changes
        monitor.setCallbacks({
            onQualityChange: (settings) => {
                this.updateQualitySettings(settings);
            }
        });
    }
    setMemoryManager(manager) {
        this.memoryManager = manager;
    }
    setAccessibilityManager(manager) {
        this.accessibilityManager = manager;
    }
    updateQualitySettings(settings) {
        this.qualitySettings = settings;
        // Apply render scale
        if (settings.renderScale !== 1.0 && this.offscreenCanvas) {
            const scaledWidth = Math.floor(this.canvas.width * settings.renderScale);
            const scaledHeight = Math.floor(this.canvas.height * settings.renderScale);
            this.offscreenCanvas.width = scaledWidth;
            this.offscreenCanvas.height = scaledHeight;
        }
        // Update texture filtering
        this.ctx.imageSmoothingEnabled = settings.textureFiltering;
        if (this.offscreenCtx) {
            this.offscreenCtx.imageSmoothingEnabled = settings.textureFiltering;
        }
        // Adjust batch size based on quality
        this.maxBatchSize = Math.floor(100 * settings.particleDensity);
    }
    getRenderStats() {
        return { ...this.renderStats };
    }
    optimizeForMobile() {
        this.qualitySettings.renderScale = 0.75;
        this.qualitySettings.textureFiltering = false;
        this.qualitySettings.postProcessing = false;
        this.maxBatchSize = 50;
        this.enableFrustumCulling = true;
        this.enableSpriteBatching = true;
        this.updateQualitySettings(this.qualitySettings);
    }
    getPerformanceRecommendations() {
        const recommendations = [];
        const stats = this.renderStats;
        if (stats.drawCalls > 100) {
            recommendations.push('High draw call count - consider sprite batching');
        }
        if (stats.renderTime > 16) {
            recommendations.push('Render time exceeds 16ms - reduce visual complexity');
        }
        if (stats.sprites > 200) {
            recommendations.push('Too many sprites - consider culling off-screen objects');
        }
        if (stats.culledNodes / (stats.sprites + stats.culledNodes) < 0.1) {
            recommendations.push('Low culling efficiency - check frustum culling implementation');
        }
        return recommendations;
    }
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = Math.floor(width * this.qualitySettings.renderScale);
            this.offscreenCanvas.height = Math.floor(height * this.qualitySettings.renderScale);
        }
        this.optimizeCanvasSettings();
    }
}

/**
 * Integration layer between InputManager and TriggerSystem
 * This bridges the new InputManager with the existing trigger system
 */
class InputIntegration {
    constructor(inputManager, triggerSystem) {
        this.previousKeyStates = new Map();
        this.previousPointerStates = new Map();
        this.inputManager = inputManager;
        this.triggerSystem = triggerSystem;
    }
    /**
     * Update input integration - should be called each frame
     * This checks for input state changes and forwards them to the trigger system
     */
    update(context) {
        this.checkKeyStateChanges(context);
        this.checkPointerStateChanges(context);
    }
    /**
     * Set up common input mappings for accessibility and navigation
     */
    setupDefaultMappings() {
        // Navigation keys
        this.inputManager.mapKey('up', 'nav-up');
        this.inputManager.mapKey('down', 'nav-down');
        this.inputManager.mapKey('left', 'nav-left');
        this.inputManager.mapKey('right', 'nav-right');
        // Action keys
        this.inputManager.mapKey('space', 'primary-action');
        this.inputManager.mapKey('enter', 'confirm');
        this.inputManager.mapKey('escape', 'cancel');
        this.inputManager.mapKey('tab', 'next');
        // WASD movement
        this.inputManager.mapKey('w', 'move-up');
        this.inputManager.mapKey('a', 'move-left');
        this.inputManager.mapKey('s', 'move-down');
        this.inputManager.mapKey('d', 'move-right');
        // Pointer mappings
        this.inputManager.mapPointer(0, 'primary-click'); // Left click
        this.inputManager.mapPointer(2, 'secondary-click'); // Right click
    }
    /**
     * Check for key state changes and forward to trigger system
     */
    checkKeyStateChanges(context) {
        // List of keys to monitor (could be expanded or made configurable)
        const keysToMonitor = [
            'space', 'enter', 'escape', 'tab',
            'up', 'down', 'left', 'right',
            'w', 'a', 's', 'd',
            'shift', 'ctrl', 'alt'
        ];
        for (const key of keysToMonitor) {
            const wasPressed = this.previousKeyStates.get(key) || false;
            const isPressed = this.inputManager.isActionPressed(this.getActionForKey(key));
            if (isPressed !== wasPressed) {
                const inputEvent = {
                    type: 'key',
                    key: key,
                    pressed: isPressed
                };
                this.triggerSystem.handleInput(inputEvent, context);
                this.previousKeyStates.set(key, isPressed);
            }
        }
    }
    /**
     * Check for pointer state changes and forward to trigger system
     */
    checkPointerStateChanges(context) {
        const buttonsToMonitor = [0, 1, 2]; // Left, middle, right
        for (const button of buttonsToMonitor) {
            const wasPressed = this.previousPointerStates.get(button) || false;
            const isPressed = this.inputManager.isActionPressed(this.getActionForPointer(button));
            if (isPressed !== wasPressed) {
                const inputEvent = {
                    type: 'pointer',
                    button: button,
                    position: this.inputManager.getPointerPosition(),
                    pressed: isPressed
                };
                this.triggerSystem.handleInput(inputEvent, context);
                this.previousPointerStates.set(button, isPressed);
            }
        }
    }
    /**
     * Get the action name for a key (based on default mappings)
     */
    getActionForKey(key) {
        const keyActionMap = {
            'up': 'nav-up',
            'down': 'nav-down',
            'left': 'nav-left',
            'right': 'nav-right',
            'space': 'primary-action',
            'enter': 'confirm',
            'escape': 'cancel',
            'tab': 'next',
            'w': 'move-up',
            'a': 'move-left',
            's': 'move-down',
            'd': 'move-right'
        };
        return keyActionMap[key] || key;
    }
    /**
     * Get the action name for a pointer button
     */
    getActionForPointer(button) {
        const buttonActionMap = {
            0: 'primary-click',
            1: 'middle-click',
            2: 'secondary-click'
        };
        return buttonActionMap[button] || `button-${button}`;
    }
    /**
     * Check if a specific action is currently pressed
     */
    isActionPressed(action) {
        return this.inputManager.isActionPressed(action);
    }
    /**
     * Check if a specific action was just pressed this frame
     */
    isActionJustPressed(action) {
        return this.inputManager.isActionJustPressed(action);
    }
    /**
     * Check if a specific action was just released this frame
     */
    isActionJustReleased(action) {
        return this.inputManager.isActionJustReleased(action);
    }
    /**
     * Get current pointer position
     */
    getPointerPosition() {
        return this.inputManager.getPointerPosition();
    }
}

/**
 * Mode-7 rendering module for fake-3D plane effects
 * Implements perspective transformation math for retro-style racing games
 */
/**
 * Mode-7 transformation math utilities
 */
class Mode7Math {
    /**
     * Transform screen coordinates to world coordinates using Mode-7 perspective
     */
    static screenToWorld(screenX, screenY, camera, viewport) {
        const { width, height, horizon } = viewport;
        // Convert screen coordinates to normalized coordinates
        const normalizedX = (screenX - width / 2) / (width / 2);
        const horizonY = height * horizon;
        // Skip horizon line to avoid division by zero
        if (Math.abs(screenY - horizonY) < 0.001) {
            return { x: camera.position.x, y: camera.position.y };
        }
        // Calculate distance from camera based on Y position and camera height
        // Points below horizon are closer, points at horizon are infinitely far
        const screenDistanceFromHorizon = screenY - horizonY;
        const distance = camera.height / (screenDistanceFromHorizon / height * Math.tan(camera.pitch));
        // Calculate world position relative to camera
        const relativeX = distance * normalizedX;
        const relativeY = distance;
        // Rotate by camera rotation and translate by camera position
        const worldX = camera.position.x + relativeX * Math.cos(camera.rotation) - relativeY * Math.sin(camera.rotation);
        const worldY = camera.position.y + relativeX * Math.sin(camera.rotation) + relativeY * Math.cos(camera.rotation);
        return { x: worldX, y: worldY };
    }
    /**
     * Transform world coordinates to screen coordinates using Mode-7 perspective
     */
    static worldToScreen(worldX, worldY, camera, viewport) {
        const { width, height, horizon } = viewport;
        // Translate world coordinates relative to camera
        const relativeX = worldX - camera.position.x;
        const relativeY = worldY - camera.position.y;
        // Rotate by camera rotation
        const rotatedX = relativeX * Math.cos(-camera.rotation) - relativeY * Math.sin(-camera.rotation);
        const rotatedY = relativeX * Math.sin(-camera.rotation) + relativeY * Math.cos(-camera.rotation);
        // Skip points behind camera or at camera position
        if (rotatedY <= 0.001) {
            return { x: -1, y: -1 }; // Off-screen marker
        }
        // Apply perspective projection
        const projectedX = rotatedX / rotatedY;
        const screenDistanceFromHorizon = camera.height / (rotatedY * Math.tan(camera.pitch));
        // Convert to screen coordinates
        const screenX = width / 2 + projectedX * (width / 2);
        const screenY = height * horizon + screenDistanceFromHorizon * height;
        return { x: screenX, y: screenY };
    }
    /**
     * Calculate texture coordinates for a world position
     */
    static getTextureCoordinates(worldPos, textureSize, scale, offset) {
        const u = (worldPos.x * scale + offset.x) % textureSize.x;
        const v = (worldPos.y * scale + offset.y) % textureSize.y;
        // Handle negative modulo
        return {
            x: u < 0 ? u + textureSize.x : u,
            y: v < 0 ? v + textureSize.y : v
        };
    }
    /**
     * Create a default Mode-7 camera
     */
    static createDefaultCamera() {
        return {
            position: { x: 0, y: 0 },
            rotation: 0,
            height: 100,
            pitch: Math.PI / 6, // 30 degrees
            fov: Math.PI / 3 // 60 degrees
        };
    }
}
/**
 * Mode-7 render module implementation
 */
class Mode7RenderModule {
    constructor() {
        this.name = 'mode7';
        this.nodeTypes = ['Mode7Plane'];
        this.textureCache = new Map();
        this.defaultCamera = Mode7Math.createDefaultCamera();
    }
    render(node, context) {
        const mode7Node = node;
        const mode7Data = this.getMode7Data(mode7Node);
        if (!mode7Data) {
            console.warn('Mode7Plane node missing required data');
            return;
        }
        // Get or create Mode-7 camera from scene
        const mode7Camera = this.getMode7Camera(context) || this.defaultCamera;
        // Load texture
        const texture = this.getTexture(mode7Data.texture);
        if (!texture) {
            this.renderPlaceholder(context, mode7Data);
            return;
        }
        // Render Mode-7 plane
        const mode7Viewport = {
            width: context.viewport.width,
            height: context.viewport.height,
            horizon: mode7Data.horizon
        };
        this.renderMode7Plane(context, mode7Data, mode7Camera, texture, mode7Viewport);
    }
    getMode7Data(node) {
        // Extract Mode-7 specific data from node
        const data = node;
        if (!data.texture) {
            return null;
        }
        return {
            texture: data.texture,
            horizon: data.horizon ?? 0.5,
            scale: data.scale ?? 1.0,
            offset: data.offset ?? { x: 0, y: 0 },
            textureWidth: data.textureWidth ?? 256,
            textureHeight: data.textureHeight ?? 256
        };
    }
    getMode7Camera(context) {
        // Look for Mode-7 camera data in the render context
        // This would be set by Mode-7 specific actions
        return context.mode7Camera || null;
    }
    getTexture(textureId) {
        // Check cache first
        if (this.textureCache.has(textureId)) {
            return this.textureCache.get(textureId);
        }
        // For now, return null - in a full implementation, this would load the texture
        // TODO: Integrate with asset loading system
        return null;
    }
    renderPlaceholder(context, data) {
        const { ctx, viewport } = context;
        const horizonY = viewport.height * data.horizon;
        // Draw a simple gradient as placeholder
        const gradient = ctx.createLinearGradient(0, horizonY, 0, viewport.height);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(1, '#228B22'); // Forest green
        ctx.fillStyle = gradient;
        ctx.fillRect(0, horizonY, viewport.width, viewport.height - horizonY);
        // Draw horizon line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(viewport.width, horizonY);
        ctx.stroke();
    }
    renderMode7Plane(context, data, camera, texture, mode7Viewport) {
        const { ctx } = context;
        const horizonY = mode7Viewport.height * data.horizon;
        // Create image data for pixel-by-pixel rendering
        const imageData = ctx.createImageData(mode7Viewport.width, mode7Viewport.height - horizonY);
        const pixels = imageData.data;
        // Create canvas for texture sampling
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = texture.width;
        textureCanvas.height = texture.height;
        const textureCtx = textureCanvas.getContext('2d');
        textureCtx.drawImage(texture, 0, 0);
        const textureData = textureCtx.getImageData(0, 0, texture.width, texture.height);
        // Render each scanline
        for (let y = 0; y < mode7Viewport.height - horizonY; y++) {
            const screenY = horizonY + y;
            this.renderScanline(pixels, y, screenY, mode7Viewport.width, data, camera, mode7Viewport, textureData);
        }
        // Draw the rendered plane
        ctx.putImageData(imageData, 0, horizonY);
    }
    renderScanline(pixels, scanlineIndex, screenY, width, data, camera, viewport, textureData) {
        const baseIndex = scanlineIndex * width * 4;
        for (let x = 0; x < width; x++) {
            // Transform screen coordinates to world coordinates
            const worldPos = Mode7Math.screenToWorld(x, screenY, camera, viewport);
            // Get texture coordinates
            const texCoords = Mode7Math.getTextureCoordinates(worldPos, { x: data.textureWidth, y: data.textureHeight }, data.scale, data.offset);
            // Sample texture
            const color = this.sampleTexture(textureData, texCoords.x, texCoords.y);
            // Set pixel color
            const pixelIndex = baseIndex + x * 4;
            pixels[pixelIndex] = color.r; // Red
            pixels[pixelIndex + 1] = color.g; // Green
            pixels[pixelIndex + 2] = color.b; // Blue
            pixels[pixelIndex + 3] = 255; // Alpha
        }
    }
    sampleTexture(textureData, u, v) {
        const x = Math.floor(u) % textureData.width;
        const y = Math.floor(v) % textureData.height;
        const index = (y * textureData.width + x) * 4;
        return {
            r: textureData.data[index],
            g: textureData.data[index + 1],
            b: textureData.data[index + 2]
        };
    }
}
/**
 * Mode-7 module definition for registration
 */
const Mode7ModuleDefinition = {
    name: 'mode7',
    nodeTypes: ['Mode7Plane'],
    actions: ['setMode7Camera', 'moveMode7Camera'],
    triggers: [],
    dependencies: [],
    size: 8 // Estimated KB
};
/**
 * Register the Mode-7 module
 */
function registerMode7Module() {
    const registry = ModuleRegistry.getInstance();
    // Register module definition
    registry.registerModule(Mode7ModuleDefinition);
    // Register render module
    const renderModule = new Mode7RenderModule();
    registry.registerRenderModule(renderModule);
    // Register action handlers
    registry.registerActionHandler('setMode7Camera', (params) => {
        // TODO: Implement Mode-7 camera action handler
        console.log('setMode7Camera action:', params);
    });
    registry.registerActionHandler('moveMode7Camera', (params) => {
        // TODO: Implement Mode-7 camera movement action handler
        console.log('moveMode7Camera action:', params);
    });
}

/**
 * Particles system module for 2D particle effects
 * Implements particle lifecycle management, physics, and rendering
 */
/**
 * Particle system manager for a single emitter
 */
class ParticleSystem {
    constructor(emitter, maxParticles) {
        this.emitter = emitter;
        this.maxParticles = maxParticles;
        this.particles = [];
        this.nextParticleId = 0;
        this.emissionAccumulator = 0;
    }
    /**
     * Update particle system - spawn new particles and update existing ones
     */
    update(deltaTime) {
        // Update existing particles
        this.updateParticles(deltaTime);
        // Remove dead particles
        this.removeDeadParticles();
        // Spawn new particles if emitter is enabled
        if (this.emitter.enabled && this.particles.length < this.maxParticles) {
            this.spawnParticles(deltaTime);
        }
    }
    /**
     * Get all active particles
     */
    getParticles() {
        return this.particles;
    }
    /**
     * Start emitting particles
     */
    startEmit() {
        this.emitter.enabled = true;
    }
    /**
     * Stop emitting particles
     */
    stopEmit() {
        this.emitter.enabled = false;
    }
    /**
     * Emit a burst of particles
     */
    burstEmit(count) {
        for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
            this.spawnParticle();
        }
    }
    /**
     * Clear all particles
     */
    clear() {
        this.particles.length = 0;
    }
    /**
     * Update emitter configuration
     */
    updateEmitter(emitter) {
        Object.assign(this.emitter, emitter);
    }
    updateParticles(deltaTime) {
        for (const particle of this.particles) {
            // Update age
            particle.age += deltaTime;
            // Update physics
            particle.velocity.x += particle.acceleration.x * deltaTime;
            particle.velocity.y += particle.acceleration.y * deltaTime;
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            // Update rotation
            particle.rotation += particle.rotationSpeed * deltaTime;
            // Update lifetime-based properties
            const lifetimeRatio = particle.age / particle.maxLifetime;
            // Interpolate alpha if end alpha is specified
            if (particle.alphaEnd !== undefined) {
                particle.alpha = this.lerp(particle.alpha, particle.alphaEnd, lifetimeRatio);
            }
            // Interpolate color if end color is specified
            if (particle.colorEnd) {
                particle.color = this.lerpColor(particle.color, particle.colorEnd, lifetimeRatio);
            }
        }
    }
    removeDeadParticles() {
        this.particles = this.particles.filter(particle => particle.age < particle.maxLifetime);
    }
    spawnParticles(deltaTime) {
        // Only spawn if rate is greater than 0
        if (this.emitter.rate <= 0) {
            return;
        }
        // Accumulate emission time
        this.emissionAccumulator += deltaTime * this.emitter.rate;
        // Spawn particles based on accumulated time
        while (this.emissionAccumulator >= 1 && this.particles.length < this.maxParticles) {
            this.spawnParticle();
            this.emissionAccumulator -= 1;
        }
    }
    spawnParticle() {
        // Calculate lifetime with variance
        const lifetime = this.emitter.lifetime +
            (Math.random() - 0.5) * 2 * this.emitter.lifetimeVariance;
        // Calculate initial velocity with variance
        const velocity = {
            x: this.emitter.velocity.x + (Math.random() - 0.5) * 2 * this.emitter.velocityVariance.x,
            y: this.emitter.velocity.y + (Math.random() - 0.5) * 2 * this.emitter.velocityVariance.y
        };
        // Calculate initial scale with variance
        const scale = this.emitter.scale + (Math.random() - 0.5) * 2 * this.emitter.scaleVariance;
        const particle = {
            id: this.nextParticleId++,
            position: { ...this.emitter.position },
            velocity,
            acceleration: { ...this.emitter.acceleration },
            scale: Math.max(0.1, scale), // Ensure minimum scale
            rotation: this.emitter.rotation,
            rotationSpeed: this.emitter.rotationSpeed,
            color: this.emitter.color,
            colorEnd: this.emitter.colorEnd,
            alpha: this.emitter.alpha,
            alphaEnd: this.emitter.alphaEnd,
            lifetime: Math.max(0.1, lifetime), // Ensure minimum lifetime
            maxLifetime: Math.max(0.1, lifetime),
            age: 0
        };
        this.particles.push(particle);
    }
    lerp(start, end, t) {
        return start + (end - start) * Math.min(1, Math.max(0, t));
    }
    lerpColor(startColor, endColor, t) {
        // Simple color interpolation - in a full implementation, this would handle RGB/HSL properly
        // For now, return the start color
        return t > 0.5 ? endColor : startColor;
    }
}
/**
 * Particles render module implementation
 */
class ParticlesRenderModule {
    constructor() {
        this.name = 'particles';
        this.nodeTypes = ['Particles2D'];
        this.particleSystems = new Map();
        this.textureCache = new Map();
    }
    render(node, context) {
        const particlesNode = node;
        // Get or create particle system for this node
        let particleSystem = this.particleSystems.get(node.id);
        if (!particleSystem) {
            particleSystem = new ParticleSystem(particlesNode.emitter, particlesNode.maxParticles);
            this.particleSystems.set(node.id, particleSystem);
        }
        // Update particle system
        const deltaTime = 1 / 60; // Fixed timestep - in full implementation, get from game loop
        particleSystem.update(deltaTime);
        // Render particles
        this.renderParticles(particleSystem.getParticles(), particlesNode, context);
    }
    /**
     * Handle particle actions
     */
    handleAction(nodeId, action, params) {
        let particleSystem = this.particleSystems.get(nodeId);
        // Create particle system if it doesn't exist for certain actions
        if (!particleSystem && (action === 'startEmit' || action === 'burstEmit')) {
            // Create a default particle system
            const defaultEmitter = {
                position: { x: 0, y: 0 },
                rate: 10,
                lifetime: 1.0,
                lifetimeVariance: 0,
                velocity: { x: 0, y: 0 },
                velocityVariance: { x: 0, y: 0 },
                acceleration: { x: 0, y: 0 },
                scale: 1.0,
                scaleVariance: 0,
                rotation: 0,
                rotationSpeed: 0,
                color: '#ffffff',
                alpha: 1.0,
                enabled: true
            };
            particleSystem = new ParticleSystem(defaultEmitter, 100);
            this.particleSystems.set(nodeId, particleSystem);
        }
        if (!particleSystem) {
            console.warn(`No particle system found for node ${nodeId}`);
            return;
        }
        switch (action) {
            case 'startEmit':
                particleSystem.startEmit();
                break;
            case 'stopEmit':
                particleSystem.stopEmit();
                break;
            case 'burstEmit':
                particleSystem.burstEmit(params.count || 10);
                break;
            default:
                console.warn(`Unknown particle action: ${action}`);
        }
    }
    /**
     * Clean up particle system for a node
     */
    cleanup(nodeId) {
        this.particleSystems.delete(nodeId);
    }
    renderParticles(particles, node, context) {
        const { ctx } = context;
        // Set blend mode
        const oldCompositeOperation = ctx.globalCompositeOperation;
        if (node.blendMode) {
            switch (node.blendMode) {
                case 'additive':
                    ctx.globalCompositeOperation = 'lighter';
                    break;
                case 'multiply':
                    ctx.globalCompositeOperation = 'multiply';
                    break;
                default:
                    ctx.globalCompositeOperation = 'source-over';
            }
        }
        // Render each particle
        for (const particle of particles) {
            this.renderParticle(particle, node, context);
        }
        // Restore blend mode
        ctx.globalCompositeOperation = oldCompositeOperation;
    }
    renderParticle(particle, node, context) {
        const { ctx } = context;
        ctx.save();
        // Apply particle transform
        ctx.translate(particle.position.x, particle.position.y);
        ctx.rotate(particle.rotation);
        ctx.scale(particle.scale, particle.scale);
        ctx.globalAlpha = particle.alpha;
        if (node.texture) {
            // Render with texture
            const texture = this.getTexture(node.texture);
            if (texture) {
                ctx.drawImage(texture, -texture.width / 2, -texture.height / 2);
            }
            else {
                // Fallback to colored rectangle
                this.renderColoredParticle(particle, ctx);
            }
        }
        else {
            // Render as colored shape
            this.renderColoredParticle(particle, ctx);
        }
        ctx.restore();
    }
    renderColoredParticle(particle, ctx) {
        const size = 4; // Base particle size
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }
    getTexture(textureId) {
        // Check cache first
        if (this.textureCache.has(textureId)) {
            return this.textureCache.get(textureId);
        }
        // For now, return null - in a full implementation, this would load the texture
        // TODO: Integrate with asset loading system
        return null;
    }
}
/**
 * Particles module definition for registration
 */
const ParticlesModuleDefinition = {
    name: 'particles',
    nodeTypes: ['Particles2D'],
    actions: ['startEmit', 'stopEmit', 'burstEmit'],
    triggers: [],
    dependencies: [],
    size: 6 // Estimated KB
};
/**
 * Register the particles module
 */
function registerParticlesModule() {
    const registry = ModuleRegistry.getInstance();
    // Register module definition
    registry.registerModule(ParticlesModuleDefinition);
    // Register render module
    const renderModule = new ParticlesRenderModule();
    registry.registerRenderModule(renderModule);
    // Register action handlers
    registry.registerActionHandler('startEmit', (params, context) => {
        if (context.nodeId) {
            renderModule.handleAction(context.nodeId, 'startEmit', params);
        }
    });
    registry.registerActionHandler('stopEmit', (params, context) => {
        if (context.nodeId) {
            renderModule.handleAction(context.nodeId, 'stopEmit', params);
        }
    });
    registry.registerActionHandler('burstEmit', (params, context) => {
        if (context.nodeId) {
            renderModule.handleAction(context.nodeId, 'burstEmit', params);
        }
    });
}

/**
 * Main entry point for the LLM Canvas Engine
 */
// Factory function for creating engine instances
function createEngine() {
    return new LLMRTEngineImpl();
}
// Global registration functions for modules
function registerModule(module) {
    const registry = ModuleRegistry.getInstance();
    registry.registerModule(module);
}
function registerRenderModule(renderModule) {
    const registry = ModuleRegistry.getInstance();
    registry.registerRenderModule(renderModule);
}

export { ActionSystem, AssetManager, AudioManager, CartridgeLoader, GameLoop, InputIntegration, InputManagerImpl, LGFValidator, LLMRTEngineImpl as LLMRTEngine, Mode7Math, Mode7ModuleDefinition, Mode7RenderModule, ModuleRegistry, NodeFactory, NodeImpl, ParticleSystem, ParticlesModuleDefinition, ParticlesRenderModule, Renderer, SceneTree, TriggerSystem, createCartridgeLoader, createEngine, loadCartridge, registerMode7Module, registerModule, registerParticlesModule, registerRenderModule, validateCartridge };
